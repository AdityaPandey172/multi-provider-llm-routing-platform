import { Router, type IRouter } from "express";
import healthRouter from "./health";
import controlPlaneRouter from "./control-plane";
import jobsRouter from "./jobs";
import {
  enforceGatewayLimits,
  requireGatewayAccess,
  requireOperatorAccess,
} from "../middlewares/access-control";

const router: IRouter = Router();

router.use(healthRouter);
router.use(
  ["/v1", "/jobs"],
  requireGatewayAccess,
  enforceGatewayLimits,
);
router.use(jobsRouter);
router.use(requireOperatorAccess, controlPlaneRouter);

export default router;
