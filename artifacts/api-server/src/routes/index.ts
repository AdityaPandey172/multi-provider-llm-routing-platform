import { Router, type IRouter } from "express";
import authRouter from "./auth";
import controlPlaneRouter from "./control-plane";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import {
  enforceGatewayLimits,
  requireGatewayAccess,
  requireOperatorAccess,
} from "../middlewares/access-control";

const router: IRouter = Router();

// Public routes — no authentication required
router.use(healthRouter);
router.use(authRouter);

// Gateway-scoped routes — bearer token or valid session
router.use(["/v1", "/jobs"], requireGatewayAccess, enforceGatewayLimits);
router.use(jobsRouter);

// Operator-scoped routes — operator bearer token or operator session
router.use(requireOperatorAccess, controlPlaneRouter);

export default router;
