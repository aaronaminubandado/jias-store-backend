import Stripe from "stripe";
import { env } from "../config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
	apiVersion: "2025-08-27.basil",
	// Retry idempotent requests on transient failures
	maxNetworkRetries: 2,
	// Per-request timeout in ms (tune to your SLOs)
	timeout: 60_000,
});

export default stripe;