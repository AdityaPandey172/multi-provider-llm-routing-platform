import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  signSession,
  verifySession,
  type AuthenticatedRequest,
} from "../middlewares/access-control.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_TTL_MS,
  path: "/",
};

const router: IRouter = Router();

/**
 * POST /api/auth/login
 * Body: { key: string }
 * Validates the provided operator key and issues a signed HttpOnly session cookie.
 * This route is intentionally public — it is the authentication entry point.
 */
router.post("/auth/login", (req: Request, res: Response): void => {
  const operatorKey = process.env.COMMAND_POST_OPERATOR_API_KEY?.trim();

  if (!operatorKey) {
    res.status(503).json({
      error:
        "API access is not configured. Set COMMAND_POST_OPERATOR_API_KEY before logging in.",
    });
    return;
  }

  const { key } = req.body as { key?: unknown };
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "Request body must include a non-empty 'key' string." });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const candidateBuf = Buffer.from(key);
  const secretBuf = Buffer.from(operatorKey);
  const match =
    candidateBuf.length === secretBuf.length &&
    timingSafeEqual(candidateBuf, secretBuf);

  if (!match) {
    res.status(401).json({ error: "Invalid operator key." });
    return;
  }

  if (!process.env.SESSION_SECRET?.trim()) {
    res.status(503).json({
      error:
        "Session signing is not configured. Set SESSION_SECRET before using browser-based login.",
    });
    return;
  }

  const cookieValue = signSession("operator");
  if (!cookieValue) {
    res.status(500).json({ error: "Failed to create session." });
    return;
  }

  res.cookie(SESSION_COOKIE_NAME, cookieValue, COOKIE_OPTIONS);
  res.status(200).json({ ok: true });
});

/**
 * GET /api/auth/me
 * Returns the current session identity, or 401 when no valid session exists.
 * Used by the console to determine whether to show the login gate.
 */
router.get("/auth/me", (req: AuthenticatedRequest, res: Response): void => {
  const cookieValue: string | undefined = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME];
  if (!cookieValue) {
    res.status(401).json({ authenticated: false });
    return;
  }
  const principal = verifySession(cookieValue);
  if (!principal) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.status(401).json({ authenticated: false });
    return;
  }
  res.status(200).json({ authenticated: true, scope: principal.scope });
});

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
router.post("/auth/logout", (_req: Request, res: Response): void => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.status(200).json({ ok: true });
});

export default router;
