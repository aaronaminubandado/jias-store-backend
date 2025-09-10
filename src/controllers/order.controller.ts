import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { IOrder, Order, OrderProduct } from "@/models/Order";
import { Product } from "@/models/Product";
import User from "@/models/User";
import { AuthRequest } from "@/middleware/auth.middleware";

/**
 * Convert an order document to API-safe payload.
 * Uses schema fields: products[].priceCents and order.totalAmount (if present).
 */
const formatOrderForAPI = (orderDoc: any, role: string) => {
	// Normalize products
	const products = (orderDoc.products || []).map((p: any) => {
		const prod = p.product || null;
		// Prefer explicit priceCents field, fallback to price * 100
		const priceCents =
			typeof p.priceCents === "number"
				? p.priceCents
				: typeof p.price === "number"
				? Math.round(p.price * 100)
				: 0;

		return {
			productId: prod?._id ?? p.product,
			name: prod?.name ?? undefined,
			image: prod?.image ?? undefined,
			quantity: p.quantity,
			priceCents,
			price: priceCents / 100,
		};
	});

	// Normalize totals
	let totalAmountCents: number | undefined = undefined;

	if (Number.isInteger(orderDoc.totalAmountCents)) {
		totalAmountCents = orderDoc.totalAmountCents;
	} else if (
		typeof orderDoc.totalAmount === "number" &&
		!Number.isNaN(orderDoc.totalAmount)
	) {
		// derive from totalAmount (assumed in dollars)
		totalAmountCents = Math.round(orderDoc.totalAmount * 100);
	}

	const base = {
		id: orderDoc._id,
		products,
		totalAmount: totalAmountCents ? totalAmountCents / 100 : null,
		totalAmountCents: totalAmountCents ?? null,
		currency: orderDoc.currency,
		status: orderDoc.status,
		createdAt: orderDoc.createdAt,
		updatedAt: orderDoc.updatedAt,
	};

	// Add admin-only fields if applicable
	if (role === "admin") {
		return {
			...base,
			paymentIntentId: orderDoc.paymentIntentId ?? null,
			checkoutSessionId: orderDoc.checkoutSessionId ?? null,
			user: orderDoc.user ?? null,
		};
	}

	return base;
};

/**
 * GET /api/orders
 * Role-based behavior:
 *  - admin: all orders (paginated)
 *  - customer: their orders
 *  - store: orders containing at least one product that belongs to this store (product.store)
 */
export const getOrders = async (req: AuthRequest, res: Response) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ message: "Unauthorized" });

		const page = Math.max(1, Number(req.query.page) || 1);
		const limit = Math.min(100, Number(req.query.limit) || 25);
		const skip = (page - 1) * limit;

		if (user.role === "admin") {
			//Include admin-only fields by selecting them explicitly
			const [orders, total] = await Promise.all([
				Order.find()
					.select("+paymentIntentId +checkoutSessionId")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate({ path: "products.product", model: Product })
					.lean()
					.exec(),
				Order.countDocuments().exec(),
			]);

			const payload = orders.map((o) => formatOrderForAPI(o, "admin"));
			return res.json({ data: payload, meta: { total, page, limit } });
		}

		if (user.role === "customer") {
			//only the user's orders
			const [orders, total] = await Promise.all([
				Order.find({ user: user.id })
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate({ path: "products.product", model: Product })
					.lean()
					.exec(),
				Order.countDocuments({ user: user.id }).exec(),
			]);

			const payload = orders.map((o) => formatOrderForAPI(o, "customer"));
			return res.json({ data: payload, meta: { total, page, limit } });
		}

		if (user.role === "store") {
			//check product for store field, find product ids belonging to this store
			const storeProductIds = await Product.find({ store: user.id })
				.distinct("_id")
				.exec();
			if (
				!Array.isArray(storeProductIds) ||
				storeProductIds.length === 0
			) {
				return res.json({ data: [], meta: { total: 0, page, limit } });
			}

			const query = { "products.product": { $in: storeProductIds } };
			const [orders, total] = await Promise.all([
				Order.find(query)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limit)
					.populate({ path: "products.product", model: Product })
					.lean()
					.exec(),
				Order.countDocuments(query).exec(),
			]);

			const payload = orders.map((o) => formatOrderForAPI(o, "store"));
			return res.json({ data: payload, meta: { total, page, limit } });
		}

		return res.status(403).json({ message: "Forbidden" });
	} catch (err: any) {
		console.error("getOrders error: ", err);
		return res.status(500).json({ message: "Failed to fetch orders" });
	}
};

/**
 * GET /api/orders/:ids
 * Resource-level permission checks.
 */
export const getOrderById = async (req: AuthRequest, res: Response) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ message: "Unauthorized" });

		const { id } = req.params;
		if (!isValidObjectId(id))
			return res.status(400).json({ message: "Invalid order id" });

		const selectForAdmin =
			user.role === "admin" ? "+paymentIntentId +checkoutSessionId" : "";

		const order = await Order.findById(id)
			.select(selectForAdmin)
			.populate({ path: "products.product", model: Product })
			.lean()
			.exec();

		if (!order) return res.status(404).json({ message: "Order not found" });

		if (user.role === "admin") {
			return res.json({ data: formatOrderForAPI(order, "admin") });
		}

		if (user.role === "customer") {
			if (!order.user || String(order.user) !== String(user.id)) {
				return res.status(403).json({ message: "Forbidden" });
			}
			return res.json({ data: formatOrderForAPI(order, "customer") });
		}

		if (user.role === "store") {
			const containsStoreProduct = (order.products || []).some(
				(p: any) => {
					const prod = p.product;
					if (!prod) return false;
					return prod.store && String(prod.store) === String(user.id);
				}
			);

			if (!containsStoreProduct) {
				return res.status(403).json({ message: "Forbidden" });
			}
			return res.json({ data: formatOrderForAPI(order, "store") });
		}

		return res.status(403).json({ message: "Forbidden" });
	} catch (err: any) {
		console.error("getOrderById error: ", err);
		return res.status(500).json({ message: "Failed to fetch order" });
	}
};
