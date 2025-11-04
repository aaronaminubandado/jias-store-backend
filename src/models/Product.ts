import mongoose, { Schema, Document } from "mongoose";

export interface ProductDocument extends Document {
	name: string;
	price: number;
	stock: number;
	reserved: number;
	category: string;
	description: string;
	image?: string;
	sku?: string;
	brand?: string;
	tags?: string[];
	featured?: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
	{
		name: { type: String, required: true },
		price: { type: Number, required: true, min: 0 },
		stock: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
			validate: {
				validator: Number.isInteger,
				message: "stock must be an integer",
			},
		},
		reserved: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
			validate: {
				validator: Number.isInteger,
				message: "reserved must be an integer",
			},
		},
		category: { type: String, required: true },
		description: { type: String },
		image: { type: String },
		sku: {
			type: String,
			unique: true,
			trim: true,
			lowercase: true,
			immutable: true,
		},
		brand: { type: String },
		tags: [{ type: String }],
		featured: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

export const Product = mongoose.model<ProductDocument>(
	"Product",
	ProductSchema
);
