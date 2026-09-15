/**
 * Cloudflare Worker gateway credential helper.
 *
 * The ollama-security-gate Worker compares the CF-Access-Client-Id /
 * CF-Access-Client-Secret header values byte-for-byte against its own stored
 * secrets. We therefore forward the stored values exactly as configured
 * (trimmed of stray whitespace only) — no other normalization.
 */
export function cfAccessHeaders(): Record<string, string> {
  const id = process.env.CF_ACCESS_CLIENT_ID?.trim();
  const secret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();
  const headers: Record<string, string> = {};
  if (id) {
    headers["CF-Access-Client-Id"] = id;
    // The gateway checks these neutral aliases first. Supplying both forms
    // keeps the request compatible with Cloudflare Access and the Worker.
    headers["x-client-id"] = id;
  }
  if (secret) {
    headers["CF-Access-Client-Secret"] = secret;
    headers["x-client-secret"] = secret;
  }
  if (Object.keys(headers).length > 0) {
    // Cloudflare's browser-integrity check (error 1010) rejects default
    // programmatic User-Agents before the token is even evaluated.
    headers["User-Agent"] = "Mozilla/5.0 (compatible; LLM-Gateway/1.0)";
  }
  return headers;
}
