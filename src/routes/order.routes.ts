import { Router } from "express";
import { getOrderById, getOrders } from "@/controllers/order.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { authorize } from "@/middleware/role.middleware";

const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get("/", getOrders);
orderRouter.get("/:id", getOrderById);

export default orderRouter;
