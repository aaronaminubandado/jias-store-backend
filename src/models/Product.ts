import mongoose, { Schema, Document } from "mongoose";

export interface ProductDocument extends Document {
	name: string;
	price: number;
	stock: number;
	category: string;
	description: string;
	image?: string;
	sku?: string;
	brand?: string;
	inStock: boolean;
	tags?: string[];
	featured?: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
	{
		name: { type: String, required: true },
		price: { type: Number, required: true },
		stock: { type: Number, required: true },
		category: { type: String, required: true },
		description: { type: String },
		image: { type: String },
		sku: { type: String, unique: true },
		brand: { type: String },
		inStock: { type: Boolean, default: true },
		tags: [{ type: String }],
		featured: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

export const Product = mongoose.model<ProductDocument>(
	"Product",
	ProductSchema
);
