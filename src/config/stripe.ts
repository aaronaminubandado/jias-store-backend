import Stripe from "stripe";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
	apiVersion: "2025-07-30.basil",
});

export default stripe;