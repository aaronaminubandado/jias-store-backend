import { Router, Express } from "express";
import bodyParser from "body-parser";
import { handleStripeWebhook } from "@/controllers/webhook.controller";
import express from "express";

const webhookRouter = Router();

// Use raw body parser specifically for Stripe webhook
webhookRouter.post(
	"/",
	express.raw({ type: "application/json" }),
	handleStripeWebhook
);

export default webhookRouter;
