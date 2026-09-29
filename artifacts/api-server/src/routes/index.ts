import { Router, type IRouter } from "express";
import healthRouter from "./health";
import advisoryRouter from "./advisory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(advisoryRouter);

export default router;
