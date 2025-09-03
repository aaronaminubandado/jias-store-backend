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
		products: [
			{
				product: { type: Schema.Types.ObjectId, ref: "Product" },
				quantity: { type: Number, required: true },
				price: { type: Number, required: true },
			},
		],
		totalAmount: { type: Number, required: true },
		currency: { type: String, default: "usd" },
		status: {
			type: String,
			enum: ["pending", "paid", "failed", "refunded"],
			default: "pending",
		},
		paymentIntentId: { type: String },
		checkoutSessionId: { type: String },
	},
	{ timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
