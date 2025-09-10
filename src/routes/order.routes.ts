import { Router } from "express";
import { getOrders } from "@/controllers/order.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { authorize } from "@/middleware/role.middleware";
import { router } from ".";

const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.use("/", getOrders);

export default orderRouter;
