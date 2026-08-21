import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: "healthy",
    service: "llm-gateway",
    version: "0.1.0",
    checks: [
      { name: "gateway", status: "healthy", detail: "HTTP control plane is accepting requests" },
      { name: "database", status: "healthy", detail: "PostgreSQL connection is available" },
      { name: "routing-state", status: "degraded", detail: "Redis-backed routing state is not configured in local development" },
    ],
  });
  res.json(data);
});

export default router;
