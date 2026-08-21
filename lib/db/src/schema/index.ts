import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const providersTable = pgTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("enabled"),
  health: text("health").notNull().default("healthy"),
  latency: real("latency").notNull().default(0),
  errorRate: real("error_rate").notNull().default(0),
  modelCount: integer("model_count").notNull().default(0),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const modelsTable = pgTable("models", {
  id: text("id").primaryKey(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providersTable.id),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  contextWindow: integer("context_window").notNull(),
  status: text("status").notNull().default("active"),
  inputRate: real("input_rate").notNull().default(0),
  outputRate: real("output_rate").notNull().default(0),
});

export const aliasesTable = pgTable("model_aliases", {
  alias: text("alias").primaryKey(),
  capability: text("capability").notNull(),
  target: text("target").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("active"),
  resolvedVersion: text("resolved_version").notNull(),
});

export const routingPoliciesTable = pgTable("routing_policies", {
  id: serial("id").primaryKey(),
  strategy: text("strategy").notNull().default("lowest_predicted_latency"),
  maxAttempts: integer("max_attempts").notNull().default(5),
  costGuardrail: real("cost_guardrail").notNull().default(18),
  standardLatency: integer("standard_latency").notNull().default(750),
  longContextLatency: integer("long_context_latency").notNull().default(2500),
  structuredLatency: integer("structured_latency").notNull().default(1200),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usageSummariesTable = pgTable("usage_summaries", {
  id: serial("id").primaryKey(),
  period: text("period").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  requests: integer("requests").notNull().default(0),
  providerCost: real("provider_cost").notNull().default(0),
  internalCost: real("internal_cost").notNull().default(0),
  cacheHitRate: real("cache_hit_rate").notNull().default(0),
  budgetUsed: real("budget_used").notNull().default(0),
  dailyLimit: real("daily_limit").notNull().default(0),
});

export const cacheSummariesTable = pgTable("cache_summaries", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("healthy"),
  hitRate: real("hit_rate").notNull().default(0),
  entries: integer("entries").notNull().default(0),
  savedTokens: integer("saved_tokens").notNull().default(0),
  backend: text("backend").notNull().default("Pinecone"),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const operationalEventsTable = pgTable("operational_events", {
  id: text("id").primaryKey(),
  level: text("level").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const securityEventsTable = pgTable("security_events", {
  id: text("id").primaryKey(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("open"),
});

export const dashboardUsersTable = pgTable("dashboard_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("active"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TimelineEvent = {
  label: string;
  detail: string;
  occurredAt: string;
  state: "complete" | "active" | "pending" | "error";
};

export const jobsTable = pgTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull().default("queued"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  attempts: integer("attempts").notNull().default(1),
  requester: text("requester"),
  timeline: jsonb("timeline").$type<TimelineEvent[]>().notNull().default([]),
  resultSummary: text("result_summary"),
  error: text("error"),
  stream: boolean("stream").notNull().default(false),
});
