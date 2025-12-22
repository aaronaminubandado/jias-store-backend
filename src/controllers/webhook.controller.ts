import { Request, Response } from "express";
import stripe from "../config/stripe";
import { env } from "../config/env";
import Stripe from "stripe";
import { Order } from "../models/Order";
import { Product } from "../models/Product";
import mongoose from "mongoose";

// Stripe webhook endpoint
export const handleStripeWebhook = async (_req: Request, res: Response) => {
	const sig = _req.headers["stripe-signature"] as string | undefined;
	let event: Stripe.Event;

	try {
		if (!sig) {
			return res.status(400).send("Missing stripe-signature header");
		}
		if (!env.STRIPE_WEBHOOK_SECRET) {
			console.error("STRIPE_WEBHOOK_SECRET is not configured");
			return res.status(500).send("Webhook misconfigured");
		}
		event = stripe.webhooks.constructEvent(
			_req.body,
			sig,
			env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err: any) {
		console.error("Webhook signature verification failed:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	let sessionDb: mongoose.ClientSession | null = null;

	try {
		sessionDb = await mongoose.startSession();

		switch (event.type) {
			case "charge.succeeded":
				console.log(`Charge succeeded ${event.type}`);
				break;

			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.payment_status !== "paid") break;

				const paymentIntentId =
					typeof session.payment_intent === "string"
						? session.payment_intent
						: session.payment_intent?.id;

				await sessionDb.withTransaction(async () => {
					const order = await Order.findOneAndUpdate(
						{ checkoutSessionId: session.id, status: "pending" },
						{ $set: { status: "paid", paymentIntentId } },
						{ new: true, session: sessionDb }
					);

					if (order) {
						// Commit reserved stock → actual stock deduction
						const ops = (order.products ?? []).map((item) => ({
							updateOne: {
								filter: {
									_id: item.product,
									reserved: { $gte: item.quantity },
								},
								update: {
									$inc: {
										stock: -item.quantity,
										reserved: -item.quantity,
									},
								},
							},
						}));

						const resBulk = await Product.bulkWrite(ops, {
							ordered: true,
						});

						if (
							resBulk.modifiedCount !==
							(order.products?.length ?? 0)
						) {
							throw new Error(
								"Insufficient reserved stock for one or more items"
							);
						}
					}
				});
				break;
			}

			case "checkout.session.expired": {
				const session = event.data.object as Stripe.Checkout.Session;
				await sessionDb.withTransaction(async () => {
					const order = await Order.findOne({
						checkoutSessionId: session.id,
					});
					if (order) {
						order.status = "failed";
						await order.save();

						// Release reserved stock
						for (const item of order.products ?? []) {
							await Product.findByIdAndUpdate(item.product, {
								$inc: { reserved: -item.quantity },
							});
						}
					}
				});
				break;
			}

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

			default:
				console.log(`Unhandled event type ${event.type}`);
		}

		res.json({ received: true });
	} catch (err: any) {
		console.error(`Error handling webhook: ${err.message}`);
		res.status(500).send("Webhook handler error");
	} finally {
		if (sessionDb) {
			await sessionDb.endSession();
		}
	}
};
