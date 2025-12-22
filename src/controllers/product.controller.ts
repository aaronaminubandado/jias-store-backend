import { Request, Response } from "express";
import { isValidObjectId, Error as MongooseError } from "mongoose";
import { Product } from "../models/Product";
import { AuthRequest } from "../middleware/auth.middleware";

const ALLOWED_PRODUCT_FIELDS = [
	// TODO: align with schema
	"name",
	"description",
	"price",
	"images",
	"category",
	"stock",
	"isActive",
];

const FORBIDDEN_KEYS = new Set<keyof any>([
	"__proto__",
	"prototype",
	"constructor",
] as const);

function pick<T extends object, K extends keyof T>(
	obj: T,
	keys: readonly K[]
): Pick<T, K> {
	return keys.reduce((acc, k) => {
		if (!Object.prototype.hasOwnProperty.call(obj, k)) return acc;
		if (typeof k === "string" && FORBIDDEN_KEYS.has(k as any)) return acc;
		const v = (obj as any)[k];
		if (v !== undefined) (acc as any)[k] = v;
		return acc;
	}, {} as Pick<T, K>);
}

// Get all products (public)
export const getProducts = async (_req: Request, res: Response) => {
	try {
		const products = await Product.find();
		return res.status(200).json(products);
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error" });
	}
};

//Create a new product (store/admin only)
export const createProduct = async (req: AuthRequest, res: Response) => {
	try {
		const payload = pick(req.body, ALLOWED_PRODUCT_FIELDS);
		const product = new Product(payload);
		await product.save();
		return res.status(201).json(product);
	} catch (err: any) {
		if (err?.code === 11000) {
			return res.status(409).json({ message: "Product already exists" });
		}
		if (err instanceof MongooseError.ValidationError) {
			return res.status(400).json({ message: err.message });
		}
		return res.status(500).json({ message: "Internal server error" });
	}
};

//Get all products (public)
export const getProductById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({ message: "Invalid product id" });
		}
		const product = await Product.findById(id).lean();
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}
		return res.status(200).json(product);
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error" });
	}
};

//Update product by ID (store/admin)
export const updateProduct = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({ message: "Invalid product id" });
		}
		const update = pick(req.body, ALLOWED_PRODUCT_FIELDS);
		if (Object.keys(update).length === 0) {
			return res
				.status(400)
				.json({ message: "No valid fields to update" });
		}
		const product = await Product.findByIdAndUpdate(
			id,
			{ $set: update },
			{
				new: true,
				runValidators: true,
				context: "query",
				omitUndefined: true,
			}
		);

		if (!product)
			return res.status(404).json({ message: "Product not found" });
		return res.status(200).json(product);
	} catch (err: any) {
		if (err?.code === 11000) {
			return res
				.status(409)
				.json({ message: "Duplicate value for unique field" });
		}
		if (err instanceof MongooseError.ValidationError) {
			return res.status(400).json({ message: err.message });
		}
		return res.status(500).json({ message: "Internal server error" });
	}
};

// Delete product by ID (store/admin)
export const deleteProduct = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({ message: "Invalid product id" });
		}

		const product = await Product.findByIdAndDelete(id);
		if (!product)
			return res.status(404).json({ message: "Product not found" });

		return res.status(204).send();
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error" });
	}
};
