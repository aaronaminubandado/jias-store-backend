import Stripe from "stripe";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
	apiVersion: "2025-08-27.basil",
});

export default stripe;