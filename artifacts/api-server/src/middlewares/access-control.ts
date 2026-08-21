import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type AccessScope = "gateway" | "operator";

export type AccessPrincipal = {
  id: string;
  scope: AccessScope;
};

export type AuthenticatedRequest = Request & {
  commandPostPrincipal?: AccessPrincipal;
};

type UsageWindow = {
  minuteStartedAt: number;
  requestsThisMinute: number;
  day: string;
  requestsToday: number;
};

const usageByPrincipal = new Map<string, UsageWindow>();

function getConfiguredKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function matchesSecret(candidate: string, secret: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const secretBuffer = Buffer.from(secret);
  return (
    candidateBuffer.length === secretBuffer.length &&
    timingSafeEqual(candidateBuffer, secretBuffer)
  );
}

function bearerToken(req: Request): string | null {
  const value = req.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token || null;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function denyUnconfigured(res: Response): void {
  res.status(503).json({
    error: "API access is not configured. Set Command Post access keys before enabling non-health routes.",
  });
}

function denyUnauthorized(res: Response): void {
  res.status(401).json({ error: "A valid bearer token is required." });
}

function authorize(requiredScope: AccessScope) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const operatorKey = getConfiguredKey("COMMAND_POST_OPERATOR_API_KEY");
    const gatewayKey = getConfiguredKey("COMMAND_POST_GATEWAY_API_KEY");

    if (!operatorKey && !gatewayKey) {
      denyUnconfigured(res);
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      denyUnauthorized(res);
      return;
    }

    if (operatorKey && matchesSecret(token, operatorKey)) {
      req.commandPostPrincipal = { id: "operator:default", scope: "operator" };
      next();
      return;
    }

    if (
      requiredScope === "gateway" &&
      gatewayKey &&
      matchesSecret(token, gatewayKey)
    ) {
      req.commandPostPrincipal = { id: "gateway:default", scope: "gateway" };
      next();
      return;
    }

    denyUnauthorized(res);
  };
}

export const requireOperatorAccess = authorize("operator");
export const requireGatewayAccess = authorize("gateway");

/**
 * Applies hard per-principal limits before any provider adapter can run.
 * Limits are intentionally conservative defaults and can be tightened through
 * deployment configuration without changing code.
 */
export function enforceGatewayLimits(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const principal = req.commandPostPrincipal;
  if (!principal) {
    denyUnauthorized(res);
    return;
  }

  const minuteLimit = parsePositiveInteger(
    process.env.GATEWAY_REQUESTS_PER_MINUTE,
    60,
  );
  const dailyLimit = parsePositiveInteger(
    process.env.GATEWAY_REQUESTS_PER_DAY,
    1_000,
  );
  const currentTime = Date.now();
  const today = new Date(currentTime).toISOString().slice(0, 10);
  const usage = usageByPrincipal.get(principal.id) ?? {
    minuteStartedAt: currentTime,
    requestsThisMinute: 0,
    day: today,
    requestsToday: 0,
  };

  if (currentTime - usage.minuteStartedAt >= 60_000) {
    usage.minuteStartedAt = currentTime;
    usage.requestsThisMinute = 0;
  }
  if (usage.day !== today) {
    usage.day = today;
    usage.requestsToday = 0;
  }

  if (usage.requestsThisMinute >= minuteLimit || usage.requestsToday >= dailyLimit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((usage.minuteStartedAt + 60_000 - currentTime) / 1_000),
    );
    res.set("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Gateway request limit reached." });
    return;
  }

  usage.requestsThisMinute += 1;
  usage.requestsToday += 1;
  usageByPrincipal.set(principal.id, usage);
  next();
}