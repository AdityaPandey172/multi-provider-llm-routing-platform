import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { cfAccessHeaders } from "../lib/cf-access.js";

const router: IRouter = Router();

type CheckStatus = "healthy" | "degraded" | "unavailable";

/**
 * Safe, read-only Ollama reachability probe.
 * Calls GET /api/tags (model discovery) — never generates model output.
 * Forwards Cloudflare Access service-token headers when configured.
 */
async function probeOllama(): Promise<{ status: CheckStatus; detail: string }> {
  const configuredBase = process.env.OLLAMA_BASE_URL;
  if (!configuredBase) {
    return { status: "unavailable", detail: "OLLAMA_BASE_URL is not configured" };
  }
  const base = configuredBase.replace(/\/+$/, "");
  const headers = cfAccessHeaders();

  try {
    const res = await fetch(`${base}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 160);
      return {
        status: "unavailable",
        detail: `Ollama endpoint returned HTTP ${res.status}${body ? ` — ${body}` : ""}`,
      };
    }
    const body = (await res.json()) as { models?: { name?: string }[] };
    const names = (body.models ?? [])
      .map((m) => m.name)
      .filter((n): n is string => typeof n === "string");
    if (names.length === 0) {
      return { status: "degraded", detail: "Ollama reachable but reports no models" };
    }
    return {
      status: "healthy",
      detail: `Ollama reachable · ${names.length} models: ${names.join(", ")}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "unavailable", detail: `Ollama probe failed: ${msg}` };
  }
}

router.get("/healthz", async (_req, res) => {
  const ollama = await probeOllama();
  const data = HealthCheckResponse.parse({
    status: "healthy",
    service: "llm-gateway",
    version: "0.1.0",
    checks: [
      { name: "gateway", status: "healthy", detail: "HTTP control plane is accepting requests" },
      { name: "database", status: "healthy", detail: "PostgreSQL connection is available" },
      { name: "routing-state", status: "degraded", detail: "Redis-backed routing state is not configured in local development" },
      { name: "ollama", status: ollama.status, detail: ollama.detail },
    ],
  });
  res.json(data);
});

export default router;
