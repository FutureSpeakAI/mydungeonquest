import { Router, type IRouter } from "express";
import healthRouter from "./health";
import platesRouter from "./plates";

const router: IRouter = Router();

router.use(healthRouter);
// Stage 7 / L5 — campaign-scoped plate storage (presign + serve)
router.use(platesRouter);

export default router;
