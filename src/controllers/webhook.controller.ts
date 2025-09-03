import { Request, Response } from "express";
import stripe from "@/config/stripe";
import { env } from "@/config/env";
import Stripe from "stripe";

//Stripe webhook endpoint
export const handleStripeWebhook = (_req: Request, res: Response) => {
	const sig = _req.headers["stripe-signature"] as string;
	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(
			_req.body,
			sig,
			env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err: any) {
		console.error("Webhook signature verification failed:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	//Handle event types
	switch (event.type) {
		case "charge.succeeded":
			console.log(`Charge succeeded ${event.type}`);
			break;
		case "checkout.session.completed":
			const session = event.data.object as Stripe.Checkout.Session;
			console.log(`Payment completed ${event.type}`);
			//TODO: Mark payment as paid in db
			break;

		case "payment_intent.succeeded":
			console.log(`Payment intent succeeded ${event.type}`);
			break;

		default:
			console.log(`Unhandled event type ${event.type}`);
	}

	res.json({ received: true });
};
