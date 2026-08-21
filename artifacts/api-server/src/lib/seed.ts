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
import { db } from "@workspace/db";
import { logger } from "./logger";

const now = () => new Date();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export async function ensureGatewaySeedData(): Promise<void> {
  const [provider] = await db
    .select({ id: providersTable.id })
    .from(providersTable)
    .limit(1);

  if (!provider) {
    await db.insert(providersTable).values([
      {
        id: "openai",
        name: "OpenAI",
        kind: "hosted",
        health: "healthy",
        latency: 218,
        errorRate: 0.18,
        modelCount: 4,
        lastCheckedAt: ago(2),
      },
      {
        id: "anthropic",
        name: "Anthropic",
        kind: "hosted",
        health: "healthy",
        latency: 284,
        errorRate: 0.31,
        modelCount: 3,
        lastCheckedAt: ago(3),
      },
      {
        id: "gemini",
        name: "Google Gemini",
        kind: "hosted",
        health: "degraded",
        latency: 412,
        errorRate: 1.7,
        modelCount: 3,
        lastCheckedAt: ago(5),
      },
      {
        id: "ollama",
        name: "Ollama",
        kind: "local",
        health: "healthy",
        latency: 146,
        errorRate: 0.04,
        modelCount: 2,
        lastCheckedAt: ago(1),
      },
      {
        id: "vllm",
        name: "vLLM",
        kind: "local",
        health: "healthy",
        latency: 174,
        errorRate: 0.09,
        modelCount: 2,
        lastCheckedAt: ago(4),
      },
      {
        id: "tgi",
        name: "Text Generation Inference",
        kind: "local",
        health: "unavailable",
        latency: 0,
        errorRate: 100,
        modelCount: 1,
        lastCheckedAt: ago(7),
      },
    ]);
  }

  const [model] = await db.select({ id: modelsTable.id }).from(modelsTable).limit(1);
  if (!model) {
    await db.insert(modelsTable).values([
      {
        id: "gpt-4o-mini",
        providerId: "openai",
        provider: "OpenAI",
        name: "GPT-4o mini",
        category: "fast",
        contextWindow: 128000,
        status: "active",
        inputRate: 0.15,
        outputRate: 0.6,
      },
      {
        id: "o3",
        providerId: "openai",
        provider: "OpenAI",
        name: "o3",
        category: "reasoning",
        contextWindow: 200000,
        status: "canary",
        inputRate: 2,
        outputRate: 8,
      },
      {
        id: "claude-sonnet",
        providerId: "anthropic",
        provider: "Anthropic",
        name: "Claude Sonnet",
        category: "general",
        contextWindow: 200000,
        status: "active",
        inputRate: 3,
        outputRate: 15,
      },
      {
        id: "claude-haiku",
        providerId: "anthropic",
        provider: "Anthropic",
        name: "Claude Haiku",
        category: "fast",
        contextWindow: 200000,
        status: "active",
        inputRate: 0.8,
        outputRate: 4,
      },
      {
        id: "gemini-2-5-flash",
        providerId: "gemini",
        provider: "Google Gemini",
        name: "Gemini 2.5 Flash",
        category: "fast",
        contextWindow: 1000000,
        status: "active",
        inputRate: 0.3,
        outputRate: 2.5,
      },
      {
        id: "gemini-2-5-pro",
        providerId: "gemini",
        provider: "Google Gemini",
        name: "Gemini 2.5 Pro",
        category: "long_context",
        contextWindow: 1000000,
        status: "active",
        inputRate: 1.25,
        outputRate: 10,
      },
      {
        id: "nomic-embed-text",
        providerId: "ollama",
        provider: "Ollama",
        name: "nomic-embed-text",
        category: "embedding",
        contextWindow: 8192,
        status: "active",
        inputRate: 0,
        outputRate: 0,
      },
      {
        id: "llama-3-1-local",
        providerId: "vllm",
        provider: "vLLM",
        name: "Llama 3.1 8B",
        category: "local",
        contextWindow: 128000,
        status: "active",
        inputRate: 0,
        outputRate: 0,
      },
    ]);
  }

  const [alias] = await db
    .select({ alias: aliasesTable.alias })
    .from(aliasesTable)
    .limit(1);
  if (!alias) {
    await db.insert(aliasesTable).values([
      {
        alias: "fast",
        capability: "Fast responses",
        target: "gpt-4o-mini",
        provider: "OpenAI",
        status: "active",
        resolvedVersion: "2026-04-01",
      },
      {
        alias: "general",
        capability: "General purpose",
        target: "claude-sonnet",
        provider: "Anthropic",
        status: "active",
        resolvedVersion: "2026-05-14",
      },
      {
        alias: "reasoning",
        capability: "Deep reasoning",
        target: "o3",
        provider: "OpenAI",
        status: "canary",
        resolvedVersion: "2026-03-27",
      },
      {
        alias: "long-context",
        capability: "Long context",
        target: "gemini-2-5-pro",
        provider: "Google Gemini",
        status: "active",
        resolvedVersion: "2026-02-20",
      },
      {
        alias: "embedding",
        capability: "Semantic embeddings",
        target: "nomic-embed-text",
        provider: "Ollama",
        status: "active",
        resolvedVersion: "local-1",
      },
    ]);
  }

  const [policy] = await db
    .select({ id: routingPoliciesTable.id })
    .from(routingPoliciesTable)
    .limit(1);
  if (!policy) {
    await db.insert(routingPoliciesTable).values({
      strategy: "lowest_predicted_latency",
      maxAttempts: 5,
      costGuardrail: 18,
      standardLatency: 750,
      longContextLatency: 2500,
      structuredLatency: 1200,
    });
  }

  const [usage] = await db
    .select({ id: usageSummariesTable.id })
    .from(usageSummariesTable)
    .limit(1);
  if (!usage) {
    await db.insert(usageSummariesTable).values({
      period: "Today · UTC",
      inputTokens: 684200,
      outputTokens: 218600,
      requests: 12840,
      providerCost: 184.72,
      internalCost: 221.66,
      cacheHitRate: 31,
      budgetUsed: 221.66,
      dailyLimit: 1000,
    });
  }

  const [cache] = await db
    .select({ id: cacheSummariesTable.id })
    .from(cacheSummariesTable)
    .limit(1);
  if (!cache) {
    await db.insert(cacheSummariesTable).values({
      status: "healthy",
      hitRate: 31,
      entries: 184200,
      savedTokens: 1260000,
      backend: "Pinecone",
      lastUpdatedAt: ago(1),
    });
  }

  const [event] = await db
    .select({ id: operationalEventsTable.id })
    .from(operationalEventsTable)
    .limit(1);
  if (!event) {
    await db.insert(operationalEventsTable).values([
      {
        id: "evt-fallback-01",
        level: "info",
        title: "Fallback recovered",
        detail: "Gemini · long-context returned to healthy after a 1.2s recovery window.",
        occurredAt: ago(6),
      },
      {
        id: "evt-canary-01",
        level: "warning",
        title: "Alias canary progressing",
        detail: "reasoning is serving 10% of eligible traffic on o3.",
        occurredAt: ago(18),
      },
      {
        id: "evt-cache-01",
        level: "info",
        title: "Cache quality improved",
        detail: "Semantic hit rate increased 4.8 points over the last 24 hours.",
        occurredAt: ago(34),
      },
      {
        id: "evt-budget-01",
        level: "warning",
        title: "Budget threshold crossed",
        detail: "user:research crossed 80% of the daily cost guardrail.",
        occurredAt: ago(49),
      },
    ]);
  }

  const [securityEvent] = await db
    .select({ id: securityEventsTable.id })
    .from(securityEventsTable)
    .limit(1);
  if (!securityEvent) {
    await db.insert(securityEventsTable).values([
      {
        id: "sec-credential-01",
        severity: "warning",
        title: "Credential access policy review",
        detail: "A provider credential was read by a newly registered adapter service.",
        occurredAt: ago(42),
        status: "acknowledged",
      },
      {
        id: "sec-pii-01",
        severity: "info",
        title: "Sensitive content redacted",
        detail: "PII detector redacted 14 fields before trace persistence.",
        occurredAt: ago(87),
        status: "resolved",
      },
      {
        id: "sec-replay-01",
        severity: "info",
        title: "Replay warning issued",
        detail: "A suspected replay request was allowed with a warning.",
        occurredAt: ago(132),
        status: "resolved",
      },
    ]);
  }

  const [user] = await db
    .select({ id: dashboardUsersTable.id })
    .from(dashboardUsersTable)
    .limit(1);
  if (!user) {
    await db.insert(dashboardUsersTable).values([
      {
        id: "usr-ada",
        name: "Ada Lovelace",
        email: "ada@northstar.example",
        role: "owner",
        provider: "Northstar SAML",
        status: "active",
        lastSeenAt: ago(3),
      },
      {
        id: "usr-grace",
        name: "Grace Hopper",
        email: "grace@northstar.example",
        role: "platform_engineer",
        provider: "Northstar SAML",
        status: "active",
        lastSeenAt: ago(18),
      },
      {
        id: "usr-margaret",
        name: "Margaret Hamilton",
        email: "margaret@northstar.example",
        role: "ml_engineer",
        provider: "Northstar SAML",
        status: "active",
        lastSeenAt: ago(61),
      },
      {
        id: "usr-katherine",
        name: "Katherine Johnson",
        email: "katherine@northstar.example",
        role: "application_developer",
        provider: "Northstar SAML",
        status: "invited",
        lastSeenAt: ago(320),
      },
    ]);
  }

  const [job] = await db.select({ id: jobsTable.id }).from(jobsTable).limit(1);
  if (!job) {
    await db.insert(jobsTable).values([
      {
        id: "job-7a4f",
        type: "message",
        model: "claude-sonnet",
        status: "streaming",
        submittedAt: ago(1),
        updatedAt: ago(0),
        attempts: 1,
        requester: "user:research",
        timeline: [
          { label: "Accepted", detail: "Gateway validation passed", occurredAt: ago(1).toISOString(), state: "complete" },
          { label: "Routed", detail: "general → Anthropic", occurredAt: ago(1).toISOString(), state: "complete" },
          { label: "Streaming", detail: "First token at 312 ms", occurredAt: ago(0).toISOString(), state: "active" },
        ],
        resultSummary: null,
        error: null,
        stream: true,
      },
      {
        id: "job-7a3d",
        type: "message",
        model: "gpt-4o-mini",
        status: "succeeded",
        submittedAt: ago(4),
        updatedAt: ago(3),
        attempts: 1,
        requester: "user:checkout",
        timeline: [
          { label: "Accepted", detail: "Gateway validation passed", occurredAt: ago(4).toISOString(), state: "complete" },
          { label: "Routed", detail: "fast → OpenAI", occurredAt: ago(4).toISOString(), state: "complete" },
          { label: "Completed", detail: "2,184 input · 642 output tokens", occurredAt: ago(3).toISOString(), state: "complete" },
        ],
        resultSummary: "Response completed in 1.08s",
        error: null,
        stream: false,
      },
      {
        id: "job-7a29",
        type: "batch",
        model: "gemini-2-5-pro",
        status: "retrying",
        submittedAt: ago(8),
        updatedAt: ago(2),
        attempts: 3,
        requester: "user:analytics",
        timeline: [
          { label: "Accepted", detail: "100 items queued", occurredAt: ago(8).toISOString(), state: "complete" },
          { label: "Routed", detail: "long-context → Gemini", occurredAt: ago(7).toISOString(), state: "complete" },
          { label: "Retrying", detail: "429 from provider · attempt 3 of 5", occurredAt: ago(2).toISOString(), state: "active" },
        ],
        resultSummary: null,
        error: null,
        stream: false,
      },
      {
        id: "job-7a10",
        type: "embedding",
        model: "nomic-embed-text",
        status: "succeeded",
        submittedAt: ago(21),
        updatedAt: ago(20),
        attempts: 1,
        requester: "user:search",
        timeline: [
          { label: "Accepted", detail: "Gateway validation passed", occurredAt: ago(21).toISOString(), state: "complete" },
          { label: "Routed", detail: "embedding → Ollama", occurredAt: ago(21).toISOString(), state: "complete" },
          { label: "Completed", detail: "1,024 vectors generated", occurredAt: ago(20).toISOString(), state: "complete" },
        ],
        resultSummary: "Embedding batch completed",
        error: null,
        stream: false,
      },
    ]);
  }

  logger.info("Gateway seed data is ready");
}