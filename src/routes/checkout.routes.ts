import { createCheckoutSession } from "@/controllers/checkout.controller";
import { Router } from "express";

const checkoutRouter = Router();

checkoutRouter.post("/", createCheckoutSession);

export default checkoutRouter;
