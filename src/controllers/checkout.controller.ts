import { Request, Response } from "express";
import stripe from "@/config/stripe";
import { env } from "@/config/env";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import mongoose from "mongoose";

interface CheckoutItem {
	id: string;
	quantity: number;
}

export const createCheckoutSession = async (_req: Request, res: Response) => {
	let order: any = null; // track created order
	let reservedOps: { id: string; quantity: number }[] = [];

	try {
		const { items } = _req.body;
		if (!items || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ message: "No items provided" });
		}
		const validId = (s: unknown): s is string =>
			typeof s === "string" && mongoose.Types.ObjectId.isValid(s);
		const isValid = items.every(
			(it: any) =>
				it &&
				validId(it.id) &&
				Number.isInteger(it.quantity) &&
				it.quantity > 0 &&
				it.quantity <= 10_000
		);
		if (!isValid) {
			return res.status(400).json({
				message:
					"Invalid items: id must be ObjectId and quantity a positive integer.",
			});
		}
		// Map for quick lookup
		const productMap = new Map<string, any>();
		const productIds = items.map((item: CheckoutItem) => item.id);
		const products = await Product.find({ _id: { $in: productIds } });

		products.forEach((p) => productMap.set(p.id.toString(), p));

		// Reserve stock atomically (available = stock - reserved)
		const reservedOps: { id: string; quantity: number }[] = [];
		for (const item of items) {
			const updated = await Product.findOneAndUpdate(
				{
					_id: item.id,
					$expr: {
						$gte: [
							{ $subtract: ["$stock", "$reserved"] },
							item.quantity,
						],
					},
				},
				{ $inc: { reserved: item.quantity } },
				{ new: true }
			);
			if (!updated) {
				throw Object.assign(
					new Error(`Not enough stock for ${item.id}`),
					{ code: "OUT_OF_STOCK" }
				);
			}
			reservedOps.push({ id: item.id, quantity: item.quantity });
		}
		// Prepare Stripe line_items
		const line_items = items.map((item) => {
			const product = productMap.get(item.id)!;
			return {
				price_data: {
					currency: "usd",
					product_data: {
						name: product.name,
						description: product.description || "",
					},
					unit_amount: Math.round(Number(product.price) * 100),
				},
				quantity: item.quantity,
			};
		});

		// Prepare order products
		const orderProducts = items.map((item) => {
			const product = productMap.get(item.id);
			return {
				product: item.id,
				quantity: item.quantity,
				priceCents: Math.round(Number(product.price) * 100), 
			};
		});

		const totalAmountCents = items.reduce((sum, item) => {
			const product = productMap.get(item.id)!;
			return (
				sum + Math.round(Number(product.price) * 100) * item.quantity
			);
		}, 0);
		const totalAmount = totalAmountCents / 100;
		// Create pending order
		const order = await Order.create({
			products: orderProducts,
			totalAmount,
			currency: "usd",
			status: "pending",
		});

		// Create Stripe session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items,
			mode: "payment",
			success_url: `${env.FRONTEND_URL}/success`,
			cancel_url: `${env.FRONTEND_URL}/cancel`,
		});

		// Link Stripe session to order
		order.checkoutSessionId = session.id;
		await order.save();

		res.status(200).json({ url: session.url });
	} catch (err: any) {
		console.error("Checkout session creation failed:", err);

		// Rollback reservations only for items that were actually reserved
		for (const op of reservedOps) {
			await Product.findOneAndUpdate(
				{ _id: op.id, reserved: { $gte: op.quantity } }, // Guard to prevent underflow
				{ $inc: { reserved: -op.quantity } }
			);
		}

		// cleanup of orphan order if it was created but session failed
		if (order && typeof order._id !== "undefined") {
			await Order.deleteOne({ _id: order._id, status: "pending" });
		}

		const code = (err && err.code) || "";
		if (code === "OUT_OF_STOCK") {
			return res.status(409).json({ error: err.message });
		}
		return res.status(500).json({
			error: err?.message || "Failed to create checkout session",
		});
	}
};
