import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  aliasesTable,
  cacheSummariesTable,
  dashboardUsersTable,
  jobsTable,
  modelsTable,
  operationalEventsTable,
  providersTable,
  routingPoliciesTable,
  securityEventsTable,
  usageSummariesTable,
} from "@workspace/db";
import {
  CreateProviderBody,
  GetOverviewResponse,
  GetRoutingPolicyResponse,
  GetUsageSummaryResponse,
  ListAliasesResponse,
  ListEventsQueryParams,
  ListEventsResponse,
  ListModelsResponse,
  ListProvidersResponse,
  ListSecurityEventsQueryParams,
  ListSecurityEventsResponse,
  ListUsersResponse,
  UpdateProviderStatusBody,
  UpdateProviderStatusParams,
  UpdateProviderStatusResponse,
  UpdateRoutingPolicyBody,
  UpdateRoutingPolicyResponse,
  GetCacheSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

router.get("/overview", async (_req, res): Promise<void> => {
  const [providers, usage, cache, activeJobs, recentActivity] = await Promise.all([
    db.select().from(providersTable),
    db.select().from(usageSummariesTable).orderBy(desc(usageSummariesTable.id)).limit(1),
    db.select().from(cacheSummariesTable).orderBy(desc(cacheSummariesTable.id)).limit(1),
    db
      .select({ count: sql<number>`count(*)` })
      .from(jobsTable)
      .where(
        inArray(jobsTable.status, ["queued", "dispatching", "running", "retrying", "streaming"]),
      ),
    db
      .select()
      .from(operationalEventsTable)
      .orderBy(desc(operationalEventsTable.occurredAt))
      .limit(4),
  ]);

  const providerCounts = providers.reduce(
    (counts, provider) => {
      counts.total += 1;
      if (provider.status === "disabled") counts.disabled += 1;
      else if (provider.health === "healthy") counts.healthy += 1;
      else counts.degraded += 1;
      return counts;
    },
    { healthy: 0, degraded: 0, disabled: 0, total: 0 },
  );
  const currentUsage = usage[0];
  const currentCache = cache[0];

  res.json(
    GetOverviewResponse.parse({
      throughput: currentUsage?.requests ? currentUsage.requests / 86400 : 0,
      latency: 284,
      availability: 99.99,
      activeJobs: Number(activeJobs[0]?.count ?? 0),
      providers: providerCounts,
      budgets: {
        inputTokens: currentUsage?.inputTokens ?? 0,
        outputTokens: currentUsage?.outputTokens ?? 0,
        requests: currentUsage?.requests ?? 0,
        cost: currentUsage?.internalCost ?? 0,
        percentUsed: currentUsage?.dailyLimit
          ? (currentUsage.internalCost / currentUsage.dailyLimit) * 100
          : 0,
      },
      recentActivity,
    }),
  );
});

router.get("/events", async (req, res): Promise<void> => {
  const params = ListEventsQueryParams.parse(req.query);
  const events = await db
    .select()
    .from(operationalEventsTable)
    .orderBy(desc(operationalEventsTable.occurredAt))
    .limit(params.limit ?? 20);
  res.json(ListEventsResponse.parse(events));
});

router.get("/providers", async (_req, res): Promise<void> => {
  const providers = await db
    .select()
    .from(providersTable)
    .orderBy(providersTable.name);
  res.json(ListProvidersResponse.parse(providers.map((provider) => ({
    ...provider,
    models: provider.modelCount,
  }))));
});

router.post("/providers", async (req, res): Promise<void> => {
  const parsed = CreateProviderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = toId(parsed.data.name);
  const [provider] = await db
    .insert(providersTable)
    .values({
      id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      status: "enabled",
      health: "degraded",
      latency: 0,
      errorRate: 0,
      modelCount: 0,
      lastCheckedAt: new Date(),
    })
    .returning();
  res.status(201).json(
    ListProvidersResponse.element.parse({
      ...provider,
      models: provider.modelCount,
    }),
  );
});

router.patch("/providers/:id/status", async (req, res): Promise<void> => {
  const params = UpdateProviderStatusParams.safeParse(req.params);
  const body = UpdateProviderStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid provider status request" });
    return;
  }
  const [provider] = await db
    .update(providersTable)
    .set({ status: body.data.status })
    .where(eq(providersTable.id, params.data.id))
    .returning();
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  res.json(
    UpdateProviderStatusResponse.parse({
      ...provider,
      models: provider.modelCount,
    }),
  );
});

router.get("/models", async (_req, res): Promise<void> => {
  const models = await db.select().from(modelsTable).orderBy(modelsTable.name);
  res.json(
    ListModelsResponse.parse(
      models.map((model) => ({
        id: model.id,
        providerId: model.providerId,
        provider: model.provider,
        name: model.name,
        category: model.category,
        contextWindow: model.contextWindow,
        status: model.status,
        pricing: { input: model.inputRate, output: model.outputRate },
      })),
    ),
  );
});

router.get("/aliases", async (_req, res): Promise<void> => {
  const aliases = await db.select().from(aliasesTable).orderBy(aliasesTable.alias);
  res.json(ListAliasesResponse.parse(aliases));
});

router.get("/routing/policy", async (_req, res): Promise<void> => {
  const [policy] = await db
    .select()
    .from(routingPoliciesTable)
    .orderBy(desc(routingPoliciesTable.id))
    .limit(1);
  if (!policy) {
    res.status(404).json({ error: "Routing policy not configured" });
    return;
  }
  res.json(
    GetRoutingPolicyResponse.parse({
      strategy: policy.strategy,
      maxAttempts: policy.maxAttempts,
      costGuardrail: policy.costGuardrail,
      latencyTargets: {
        standard: policy.standardLatency,
        longContext: policy.longContextLatency,
        structured: policy.structuredLatency,
      },
      updatedAt: policy.updatedAt,
    }),
  );
});

router.put("/routing/policy", async (req, res): Promise<void> => {
  const parsed = UpdateRoutingPolicyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(routingPoliciesTable)
    .orderBy(desc(routingPoliciesTable.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Routing policy not configured" });
    return;
  }
  const [updated] = await db
    .update(routingPoliciesTable)
    .set({
      costGuardrail: parsed.data.costGuardrail,
      standardLatency: parsed.data.standardLatency,
      longContextLatency: parsed.data.longContextLatency,
      structuredLatency: parsed.data.structuredLatency,
      updatedAt: new Date(),
    })
    .where(eq(routingPoliciesTable.id, existing.id))
    .returning();
  res.json(
    UpdateRoutingPolicyResponse.parse({
      strategy: updated.strategy,
      maxAttempts: updated.maxAttempts,
      costGuardrail: updated.costGuardrail,
      latencyTargets: {
        standard: updated.standardLatency,
        longContext: updated.longContextLatency,
        structured: updated.structuredLatency,
      },
      updatedAt: updated.updatedAt,
    }),
  );
});

router.get("/usage/summary", async (_req, res): Promise<void> => {
  const [usage] = await db
    .select()
    .from(usageSummariesTable)
    .orderBy(desc(usageSummariesTable.id))
    .limit(1);
  if (!usage) {
    res.status(404).json({ error: "Usage summary unavailable" });
    return;
  }
  res.json(GetUsageSummaryResponse.parse(usage));
});

router.get("/cache/summary", async (_req, res): Promise<void> => {
  const [cache] = await db
    .select()
    .from(cacheSummariesTable)
    .orderBy(desc(cacheSummariesTable.id))
    .limit(1);
  if (!cache) {
    res.status(404).json({ error: "Cache summary unavailable" });
    return;
  }
  res.json(GetCacheSummaryResponse.parse(cache));
});

router.get("/security/events", async (req, res): Promise<void> => {
  const params = ListSecurityEventsQueryParams.parse(req.query);
  const events = await db
    .select()
    .from(securityEventsTable)
    .orderBy(desc(securityEventsTable.occurredAt))
    .limit(params.limit ?? 20);
  res.json(ListSecurityEventsResponse.parse(events));
});

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(dashboardUsersTable)
    .orderBy(dashboardUsersTable.name);
  res.json(ListUsersResponse.parse(users));
});

export default router;