import { Request, Response } from "express";
import stripe from "@/config/stripe";
import { env } from "@/config/env";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

export const createCheckoutSession = async (_req: Request, res: Response) => {
	try {
		const { items } = _req.body;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ message: "No items in provided" });
		}

		//Fetch items from DB prevent client manipulation
		const line_items = await Promise.all(
			items.map(async (item: any) => {
				const product = await Product.findById(item.id);
				if (!product) throw new Error(`Product not found: ${item.id}`);
				if (item.quantity < 1)
					throw new Error("Quantity must be atleast 1");
				if (product.stock < item.quantity)
					throw new Error(`Not enough stock for ${product.name}`);
				return {
					price_data: {
						currency: "usd",
						product_data: {
							name: product.name,
							description: product.description || "",
						},
						unit_amount: Math.round(product.price * 100),
					},
					quantity: item.quantity,
				};
			})
		);

		const order = await Order.create({
			products: await Promise.all(
				items.map(async (item: any) => {
					const product = await Product.findById(item.id);
					return {
						product: item.id,
						quantity: item.quantity,
						price: product!.price, // from DB
					};
				})
			),
			totalAmount: await items.reduce(
				async (sum: Promise<number>, item: any) => {
					const product = await Product.findById(item.id);
					return (await sum) + product!.price * item.quantity;
				},
				Promise.resolve(0)
			),
			currency: "usd",
			status: "pending",
		});

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items,
			mode: "payment",
			success_url: `${env.FRONTEND_URL}/success`,
			cancel_url: `${env.FRONTEND_URL}/cancel`,
		});


        // Update order with Stripe session id
		order.checkoutSessionId = session.id;
		await order.save();


		res.status(200).json({ url: session.url });
	} catch (err: any) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
};
