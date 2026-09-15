# Command Post

Command Post is a multi-provider LLM gateway and operator console for teams that need one place to manage model access, routing policy, asynchronous jobs, usage visibility, and operational events.

The project exposes a single gateway surface for hosted and local models, with a web console for platform and ML engineers. The initial deployment focus is OpenAI, Anthropic, Google Gemini, and Ollama reached through a separately provisioned remote worker endpoint.

> **Project status:** Phase 1 / initial release. The control-plane experience, browser login, hosted-provider adapters, and validated remote Ollama routing are implemented. Redis-backed routing state, semantic caching, and GPU hosting remain outside this repository.

## Why Command Post

Direct provider integrations spread credentials, model-specific behavior, streaming logic, and failure handling across application services. Command Post centralizes that operational layer so clients use one contract while platform teams manage provider posture and gateway behavior in one console.

## Architecture

```text
React operator console
        │
        ▼
Express gateway API (/api)
        │
        ├── PostgreSQL + Drizzle: providers, models, jobs, policies, events
        ├── OpenAPI contract → generated React Query client + Zod validators
        └── Provider adapters
              ├── OpenAI
              ├── Anthropic
              ├── Google Gemini
              └── Ollama (validated remote worker endpoint)
```

The API uses asynchronous jobs for non-streaming work (`202` plus polling) and server-sent events for streaming messages. Job outcomes are persisted even when a streaming client disconnects.

## Repository layout

```text
artifacts/
  api-server/             Express API and provider adapter layer
  llm-gateway-console/   React/Vite landing page and operator console
  mockup-sandbox/         Isolated component-preview workspace
lib/
  api-spec/               OpenAPI source of truth and Orval configuration
  api-client-react/       Generated React Query client
  api-zod/                Generated request/response validators
  db/                     Drizzle schema and PostgreSQL access
scripts/                  Workspace utility and post-merge scripts
```

`artifacts/*` are deployable applications. `lib/*` packages contain shared code and generated API artifacts. Avoid importing directly from one artifact into another; put reusable logic in `lib/`.

## Technology

- **Runtime:** Node.js 24, TypeScript, pnpm workspaces
- **Web:** React, Vite, Wouter, TanStack Query, Tailwind CSS
- **API:** Express 5, OpenAPI, Zod, server-sent events
- **Data:** PostgreSQL and Drizzle ORM
- **Providers:** OpenAI, Anthropic, Google Gemini, and Ollama

## Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL 16+ for local development
- At least one provider credential, or a reachable Ollama worker endpoint

## Local setup

1. Install workspace dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and configure the values you need:

   ```bash
   cp .env.example .env
   ```

   The API and database scripts load the repository root `.env` automatically when it exists, using Node's `--env-file` support. Environment variables already supplied by Replit or your shell take precedence.

3. Create the development database schema:

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Start the API and console in separate terminals:

   ```bash
   pnpm --filter @workspace/api-server run dev
   pnpm --filter @workspace/llm-gateway-console run dev
   ```

In Replit, use the managed workflows instead of starting a root-level development command. The shared proxy serves the web console at `/` and mounts the API at `/api`.

## Environment configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string; managed by Replit in this workspace |
| `OPENAI_API_KEY` | Optional | Enables OpenAI requests |
| `ANTHROPIC_API_KEY` | Optional | Enables Anthropic requests |
| `GOOGLE_GEMINI_API_KEY` | Optional | Enables Google Gemini requests |
| `COMMAND_POST_OPERATOR_API_KEY` | Yes for browser login | Operator key validated by `/api/auth/login` |
| `COMMAND_POST_GATEWAY_API_KEY` | Yes for gateway access | Bearer key for application gateway requests |
| `SESSION_SECRET` | Yes for browser login | High-entropy secret used to sign the operator's HttpOnly session cookie |
| `GATEWAY_REQUESTS_PER_MINUTE` | Optional | Per-principal gateway request ceiling; defaults to `60` |
| `GATEWAY_REQUESTS_PER_DAY` | Optional | Per-principal daily gateway request budget; defaults to `1000` |
| `OLLAMA_BASE_URL` | Optional | Base URL for the validated remote Ollama worker endpoint |
| `CF_ACCESS_CLIENT_ID` | Optional | Cloudflare Access service-token client ID forwarded to the Ollama worker |
| `CF_ACCESS_CLIENT_SECRET` | Optional | Cloudflare Access service-token secret forwarded to the Ollama worker |

Store credentials in Replit Secrets or your deployment platform's secret manager. Never commit `.env` files, API keys, private certificates, or database dumps.

For a remote Ollama deployment, `OLLAMA_BASE_URL` must be reachable from the API service. `localhost` refers to the Replit environment, not your laptop or external GPU host. The remote worker must expose Ollama-compatible `/api/tags` and OpenAI-compatible `/v1` endpoints. Command Post probes `/api/tags` through the public health check and routes model requests through `/v1`.

When the worker is protected by Cloudflare Access, set both `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. Command Post forwards the service-token headers server-side; these values are never sent to the browser.

### API access control

The health check and browser login endpoints are public. All other API routes fail closed until access keys are configured:

- The browser console posts the operator key to `/api/auth/login`. On success, the API issues a signed, eight-hour HttpOnly session cookie. The key is not stored in browser storage or exposed in the generated client.
- Control-plane routes (`/api/overview`, providers, routing, usage, and security events) accept the operator session cookie or `Authorization: Bearer <COMMAND_POST_OPERATOR_API_KEY>`.
- Gateway routes (`/api/jobs` and `/api/v1/*`) accept either the operator key or `COMMAND_POST_GATEWAY_API_KEY`.
- Gateway requests are limited per authenticated principal before dispatch, and gateway principals can only read or cancel their own jobs.

The console uses same-origin API requests, so permissive cross-origin access is intentionally not enabled. Configure both `COMMAND_POST_OPERATOR_API_KEY` and `SESSION_SECRET` before opening the dashboard.

## Common commands

```bash
# Full workspace typecheck
pnpm run typecheck

# Full workspace build outside Replit
PORT=8080 BASE_PATH=/ pnpm run build

# Regenerate API client and validators after editing the OpenAPI contract
pnpm --filter @workspace/api-spec run codegen

# Apply the development database schema
pnpm --filter @workspace/db run push

# Check a single artifact
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/llm-gateway-console run typecheck
```

## API contract workflow

`lib/api-spec/openapi.yaml` is the API source of truth.

1. Update the OpenAPI contract.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Commit the generated changes under `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`.
4. Run `pnpm run typecheck`.

## Current limitations

- Redis-backed routing state and semantic-cache infrastructure are not provisioned.
- OAuth and SAML are not implemented; the browser console uses the built-in operator-key login and signed session cookie.
- Hosted-provider credentials must have valid provider billing and quota.
- Ollama GPU hosting remains external; Command Post does not host GPU inference in Replit. The API requires a network-reachable, Ollama-compatible worker endpoint.
- Dynamic cost/latency routing and automatic multi-provider failover require additional production infrastructure and validation.

## Release checklist

Before a release push:

```bash
pnpm run typecheck
PORT=8080 BASE_PATH=/ pnpm run build
git status
```

Review the staged files before committing. This repository intentionally ignores environment files, credentials, generated build output, personal attachments, and agent-local workspace state.

## License

MIT