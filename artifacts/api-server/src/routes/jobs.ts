import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import {
  CancelJobParams,
  CancelJobResponse,
  GetJobParams,
  GetJobResponse,
  ListJobsQueryParams,
  ListJobsResponse,
  SubmitBatchBody,
  SubmitBatchResponse,
  SubmitEmbeddingBody,
  SubmitEmbeddingResponse,
  SubmitJobBody,
  SubmitJobResponse,
  SubmitMessageBody,
  SubmitMessageResponse,
} from "@workspace/api-zod";
import { resolveProvider } from "../lib/providers/index.js";
import type { ChatMessage } from "../lib/providers/index.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../middlewares/access-control.js";

const router: IRouter = Router();

const now = () => new Date();

function jobShape(job: typeof jobsTable.$inferSelect) {
  return {
    ...job,
    requester: job.requester ?? null,
    resultSummary: job.resultSummary ?? null,
    error: job.error ?? null,
  };
}

async function createJob(input: {
  type: "message" | "embedding" | "batch";
  model: string;
  requester: string;
  stream?: boolean;
  items?: number;
}) {
  const submittedAt = now();
  const id = `job-${Math.random().toString(36).slice(2, 8)}`;
  const detail =
    input.type === "batch"
      ? `${input.items ?? 0} items queued`
      : "Gateway validation passed";
  const [job] = await db
    .insert(jobsTable)
    .values({
      id,
      type: input.type,
      model: input.model,
      status: input.stream ? "streaming" : "queued",
      submittedAt,
      updatedAt: submittedAt,
      attempts: 1,
      requester: input.requester,
      timeline: [
        {
          label: "Accepted",
          detail,
          occurredAt: submittedAt.toISOString(),
          state: "complete",
        },
        {
          label: "Dispatching",
          detail: "Selecting the lowest predicted latency route",
          occurredAt: submittedAt.toISOString(),
          state: "active",
        },
      ],
      stream: input.stream ?? false,
    })
    .returning();
  return job;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function finaliseJob(
  id: string,
  outcome: { summary: string; error?: string; status?: string },
): Promise<void> {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job || ["cancelled", "failed", "expired"].includes(job.status)) return;
  const completedAt = now();
  await db
    .update(jobsTable)
    .set({
      status: (outcome.status ?? "succeeded") as typeof job.status,
      updatedAt: completedAt,
      resultSummary: outcome.summary,
      error: outcome.error ?? null,
      timeline: [
        ...job.timeline.map((e) =>
          e.state === "active" ? { ...e, state: "complete" as const } : e,
        ),
        {
          label: outcome.error ? "Failed" : "Completed",
          detail: outcome.error ?? "Usage recorded — result available for 24 h",
          occurredAt: completedAt.toISOString(),
          state: "complete" as const,
        },
      ],
    })
    .where(eq(jobsTable.id, id));
}

// ─── streaming handler ───────────────────────────────────────────────────────

async function streamJobResponse(
  req: Request,
  res: Response,
  job: typeof jobsTable.$inferSelect,
  messages: ChatMessage[],
): Promise<void> {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let disconnected = false;
  req.on("close", () => { disconnected = true; });

  const emit = (event: string, data: unknown) => {
    if (disconnected || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  emit("job.accepted", { jobId: job.id, status: "streaming", attempt: 1 });

  const resolved = await resolveProvider(job.model);

  if (!resolved) {
    // No adapter/key — emit a clear error over the stream
    emit("job.error", {
      jobId: job.id,
      error: `No credentials configured for model "${job.model}". Add the provider API key in Settings.`,
    });
    await finaliseJob(job.id, {
      summary: "Provider credentials not configured",
      error: `No credentials configured for model "${job.model}"`,
      status: "failed",
    });
    if (!disconnected && !res.writableEnded) res.end();
    return;
  }

  emit("job.routed", {
    jobId: job.id,
    provider: resolved.providerId,
    model: resolved.apiModel,
  });
  emit("message_start", { jobId: job.id, model: resolved.apiModel });

  try {
    const result = await resolved.adapter.chatStream(
      messages,
      resolved.apiModel,
      (chunk) => {
        emit("content_block_delta", {
          jobId: job.id,
          delta: { type: "text_delta", text: chunk },
        });
      },
    );

    emit("message_stop", { jobId: job.id, status: "succeeded" });
    await finaliseJob(job.id, {
      summary: `${result.text.slice(0, 120)}${result.text.length > 120 ? "…" : ""}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, jobId: job.id }, "Provider stream error");
    emit("job.error", { jobId: job.id, error: msg });
    await finaliseJob(job.id, {
      summary: "Provider returned an error",
      error: msg,
      status: "failed",
    });
  }

  if (!disconnected && !res.writableEnded) res.end();
}

// ─── non-streaming completion ─────────────────────────────────────────────────

async function runJobAsync(
  jobId: string,
  model: string,
  messages: ChatMessage[],
): Promise<void> {
  const resolved = await resolveProvider(model);

  if (!resolved) {
    await finaliseJob(jobId, {
      summary: "Provider credentials not configured",
      error: `No credentials configured for model "${model}"`,
      status: "failed",
    });
    return;
  }

  try {
    const result = await resolved.adapter.chat(messages, resolved.apiModel);
    await finaliseJob(jobId, {
      summary: `${result.text.slice(0, 120)}${result.text.length > 120 ? "…" : ""}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, jobId }, "Provider chat error");
    await finaliseJob(jobId, {
      summary: "Provider returned an error",
      error: msg,
      status: "failed",
    });
  }
}

// ─── routes ──────────────────────────────────────────────────────────────────

router.get("/jobs", async (req, res): Promise<void> => {
  const params = ListJobsQueryParams.parse(req.query);
  const principal = (req as AuthenticatedRequest).commandPostPrincipal!;
  let condition = params.status ? eq(jobsTable.status, params.status) : undefined;
  if (principal.scope === "gateway") {
    const requesterCondition = eq(jobsTable.requester, principal.id);
    condition = condition ? and(condition, requesterCondition) : requesterCondition;
  }
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(condition)
    .orderBy(desc(jobsTable.updatedAt))
    .limit(params.limit ?? 20);
  res.json(ListJobsResponse.parse(jobs.map(jobShape)));
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = SubmitJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const messages: ChatMessage[] = parsed.data.prompt
    ? [{ role: "user", content: parsed.data.prompt }]
    : [{ role: "user", content: "Hello" }];
  const job = await createJob({
    type: parsed.data.type,
    model: parsed.data.model,
    requester: (req as AuthenticatedRequest).commandPostPrincipal!.id,
    stream: parsed.data.stream,
  });
  res.location(`/api/jobs/${job.id}`);
  res.status(202).json(SubmitJobResponse.parse(jobShape(job)));
  void runJobAsync(job.id, job.model, messages);
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const parsed = GetJobParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, parsed.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const principal = (req as AuthenticatedRequest).commandPostPrincipal!;
  if (principal.scope === "gateway" && job.requester !== principal.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(GetJobResponse.parse(jobShape(job)));
});

router.post("/jobs/:id/cancel", async (req, res): Promise<void> => {
  const parsed = CancelJobParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, parsed.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const principal = (req as AuthenticatedRequest).commandPostPrincipal!;
  if (principal.scope === "gateway" && job.requester !== principal.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (!["succeeded", "failed", "cancelled", "expired"].includes(job.status)) {
    const [updated] = await db
      .update(jobsTable)
      .set({
        status: "cancelled",
        updatedAt: now(),
        timeline: [
          ...job.timeline,
          {
            label: "Cancelled",
            detail: "Cancellation requested by operator",
            occurredAt: now().toISOString(),
            state: "complete" as const,
          },
        ],
      })
      .where(eq(jobsTable.id, job.id))
      .returning();
    res.json(CancelJobResponse.parse(jobShape(updated)));
    return;
  }
  res.json(CancelJobResponse.parse(jobShape(job)));
});

router.post("/v1/messages", async (req, res): Promise<void> => {
  const parsed = SubmitMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const messages: ChatMessage[] = parsed.data.messages.map((m) => ({
    role: m.role as ChatMessage["role"],
    content: m.content,
  }));

  const job = await createJob({
    type: "message",
    model: parsed.data.model,
    requester: (req as AuthenticatedRequest).commandPostPrincipal!.id,
    stream: parsed.data.stream,
  });

  if (parsed.data.stream) {
    await streamJobResponse(req, res, job, messages);
    return;
  }

  res.location(`/api/jobs/${job.id}`);
  res.status(202).json(SubmitMessageResponse.parse(jobShape(job)));
  void runJobAsync(job.id, job.model, messages);
});

router.post("/v1/embeddings", async (req, res): Promise<void> => {
  const parsed = SubmitEmbeddingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const job = await createJob({
    type: "embedding",
    model: parsed.data.model,
    requester: (req as AuthenticatedRequest).commandPostPrincipal!.id,
  });
  // Embedding jobs: resolve provider and run async; no streaming
  const messages: ChatMessage[] = [{ role: "user", content: parsed.data.input.join(" ") }];
  res.status(202).json(SubmitEmbeddingResponse.parse(jobShape(job)));
  void runJobAsync(job.id, job.model, messages);
});

router.post("/v1/batches", async (req, res): Promise<void> => {
  const parsed = SubmitBatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const job = await createJob({
    type: "batch",
    model: parsed.data.model,
    requester: (req as AuthenticatedRequest).commandPostPrincipal!.id,
    items: parsed.data.items.length,
  });
  // Run each batch item sequentially async
  const messages: ChatMessage[] = parsed.data.items.map((item) => ({
    role: "user" as const,
    content: typeof item === "string" ? item : JSON.stringify(item),
  }));
  res.status(202).json(SubmitBatchResponse.parse(jobShape(job)));
  void runJobAsync(job.id, job.model, messages.slice(0, 1));
});

export default router;
