import { Request, Response } from "express";
import stripe from "@/config/stripe";
import { env } from "@/config/env";
import Stripe from "stripe";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";

//Stripe webhook endpoint
export const handleStripeWebhook = async (_req: Request, res: Response) => {
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

	try {
		//Handle event types
		switch (event.type) {
			case "charge.succeeded":
				console.log(`Charge succeeded ${event.type}`);
				break;
			case "checkout.session.completed":
				const session = event.data.object as Stripe.Checkout.Session;

				const order = await Order.findOne({
					checkoutSessionId: session.id,
				});
				if (order && order.status === "pending") {
					order.status = "paid";
					order.paymentIntentId = session.payment_intent as string;
					await order.save();
					// Decrement stock for each product
					for (const item of order.products) {
						await Product.findByIdAndUpdate(item.product, {
							$inc: { stock: -item.quantity },
						});
					}
				}
				console.log(`Payment completed ${event.type}`);

				break;

			case "payment_intent.succeeded":
				console.log(`Payment intent succeeded ${event.type}`);
				break;

			case "payment_intent.payment_failed": {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				const order = await Order.findOne({
					paymentIntentId: paymentIntent.id,
				});
				if (order) {
					order.status = "failed";
					await order.save();
				}
				break;
			}

			case "checkout.session.expired": {
				const session = event.data.object as Stripe.Checkout.Session;
				const order = await Order.findOne({
					checkoutSessionId: session.id,
				});
				if (order) {
					order.status = "failed";
					await order.save();
				}
				break;
			}

			default:
				console.log(`Unhandled event type ${event.type}`);
		}

		res.json({ received: true });
	} catch (err: any) {
		console.error(`Error handling webhook: ${err.message}`);
		res.status(500).send("Webhook handler error");
	}
};
