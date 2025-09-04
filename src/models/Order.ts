import mongoose, { Schema, Document } from "mongoose";

export interface OrderProduct {
	product: mongoose.Types.ObjectId; // or ProductDocument["_id"]
	quantity: number;
	price: number;
}

export interface IOrder extends Document {
	user?: mongoose.Types.ObjectId; // optional (guest checkout)
	products: OrderProduct[];
	totalAmount: number;
	currency: string;
	status: "pending" | "paid" | "failed" | "refunded";
	paymentIntentId?: string;
	checkoutSessionId?: string;
	createdAt: Date;
	updatedAt: Date;
}

const OrderSchema: Schema<IOrder> = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: "User", required: false },
		products: {
			type: [
				{
					_id: false,
					product: {
						type: Schema.Types.ObjectId,
						ref: "Product",
						required: true,
					},
					quantity: {
						type: Number,
						required: true,
						min: 1,
						validate: {
							validator: Number.isInteger,
							message: "quantity must be an integer",
						},
					},
					priceCents: {
						type: Number,
						required: true,
						min: 0,
						validate: {
							validator: Number.isInteger,
							message: "priceCents must be an integer",
						},
					},
				},
			],
			required: true,
			validate: [
				(arr: unknown[]) => Array.isArray(arr) && arr.length > 0,
				"Order must have at least one product",
			],
		},
		totalAmount: { type: Number, required: true },
		currency: { type: String, default: "usd" },
		status: {
			type: String,
			enum: ["pending", "paid", "failed", "refunded"],
			default: "pending",
		},
		paymentIntentId: {
			type: String,
			index: true,
			unique: true,
			sparse: true,
			select: false,
		},
		checkoutSessionId: {
			type: String,
			index: true,
			unique: true,
			sparse: true,
			select: false,
		},
	},
	{ timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
