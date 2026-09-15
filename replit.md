# Command Post

Command Post is a Phase 1 operator console and control-plane API for routing asynchronous LLM gateway jobs across hosted and local providers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on the configured `PORT`
- `pnpm --filter @workspace/llm-gateway-console run dev` — run the operator console
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/` — Express control-plane API and gateway job endpoints
- `artifacts/llm-gateway-console/` — deployable React/Vite operator console
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/index.ts` — Drizzle schema for providers, models, jobs, usage, cache, events, and users
- `artifacts/mockup-sandbox/` — reusable design mockup workspace

## Architecture decisions

- The shared Express API remains mounted at `/api`; the console is a separate root web artifact and uses relative API requests through the workspace proxy.
- OpenAPI is the contract source of truth; Orval generates the React Query client and Zod validators.
- Phase 1 control-plane data is PostgreSQL-backed through Drizzle, with a small idempotent seed set for the local operator experience.
- Submission-time streaming jobs use SSE and persist their terminal status even when the client disconnects; non-streaming work uses `202` jobs and polling.
- Provider/model routing, Redis state, external secret-manager credentials, SAML, and OAuth issuer integrations are represented by the control-plane surface but require deployment-specific infrastructure configuration.

## Product

The console gives platform and ML engineers a live operating picture: provider posture, routing guardrails, usage and budgets, semantic cache quality, asynchronous job timelines, security events, identity administration, and safe gateway probes. The API exposes versioned async job, message, embedding, batch, model, health, and control-plane operations.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Vite builds require workflow-provided `PORT` and `BASE_PATH`; use the managed web workflow or provide both variables for ad hoc builds.
- The local health report intentionally marks Redis routing state degraded because Redis is not provisioned in this development environment.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
