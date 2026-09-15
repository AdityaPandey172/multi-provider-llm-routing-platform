/**
 * Provider router — resolves an internal model ID (as stored in the DB) to
 * the right adapter instance and the actual upstream model string.
 */
import { db, modelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createOpenAICompatAdapter } from "./openai-compat.js";
import { createAnthropicAdapter } from "./anthropic.js";
import { createGeminiAdapter } from "./gemini.js";
import { cfAccessHeaders } from "../cf-access.js";
import type { ProviderAdapter } from "./types.js";

/**
 * Maps internal model IDs (as seeded in the DB) to the upstream API model
 * string the provider expects in its API call.
 */
const API_MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "gpt-4o-mini",
  "o3": "o3",
  "claude-sonnet": "claude-sonnet-4-5",
  "claude-haiku": "claude-haiku-4-5",
  "gemini-2-5-flash": "gemini-2.5-flash",
  "gemini-2-5-pro": "gemini-2.5-pro",
  // Ollama models — names must match exactly what Ollama reports in /api/tags
  "deepseek-r1": "deepseek-r1:1.5b",
  "llama3-2": "llama3.2:latest",
  // Legacy entries kept for backward compatibility
  "nomic-embed-text": "nomic-embed-text",
  "llama-3-1-local": "llama3.1",
};

export interface ResolvedProvider {
  adapter: ProviderAdapter;
  apiModel: string;
  providerId: string;
}

/**
 * Resolves a model ID (internal) → adapter + upstream model name.
 * Returns null if the provider's credential / URL is not configured.
 */
export async function resolveProvider(
  modelId: string,
): Promise<ResolvedProvider | null> {
  // Look up in DB first; fall back to heuristic inference
  const [row] = await db
    .select({ providerId: modelsTable.providerId })
    .from(modelsTable)
    .where(eq(modelsTable.id, modelId));

  const providerId = row?.providerId ?? inferProvider(modelId);
  const apiModel = API_MODEL_MAP[modelId] ?? modelId;
  const adapter = buildAdapter(providerId);

  if (!adapter) return null;
  return { adapter, apiModel, providerId };
}

function inferProvider(modelId: string): string {
  if (/^(gpt|o1|o3)/.test(modelId)) return "openai";
  if (/^claude/.test(modelId)) return "anthropic";
  if (/^gemini/.test(modelId)) return "gemini";
  if (/llama|mistral|nomic/.test(modelId)) return "ollama";
  return "openai";
}

function buildAdapter(providerId: string): ProviderAdapter | null {
  switch (providerId) {
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return null;
      return createOpenAICompatAdapter({ apiKey: key });
    }
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return null;
      return createAnthropicAdapter({ apiKey: key });
    }
    case "gemini": {
      const key = process.env.GOOGLE_GEMINI_API_KEY;
      if (!key) return null;
      return createGeminiAdapter({ apiKey: key });
    }
    case "ollama": {
      const base = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/+$/, "");
      const defaultHeaders = cfAccessHeaders();
      return createOpenAICompatAdapter({
        apiKey: "ollama",
        baseURL: `${base}/v1`,
        defaultHeaders: Object.keys(defaultHeaders).length ? defaultHeaders : undefined,
      });
    }
    case "vllm": {
      const base = process.env.VLLM_BASE_URL ?? "http://localhost:8000";
      return createOpenAICompatAdapter({ apiKey: "vllm", baseURL: `${base}/v1` });
    }
    case "tgi": {
      const base = process.env.TGI_BASE_URL ?? "http://localhost:3000";
      return createOpenAICompatAdapter({ apiKey: "tgi", baseURL: `${base}/v1` });
    }
    default:
      return null;
  }
}
