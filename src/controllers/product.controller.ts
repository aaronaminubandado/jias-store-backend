import { Request, Response } from "express";
import { isValidObjectId, Error as MongooseError } from "mongoose";
import { Product } from "@/models/Product";
import { AuthRequest } from "@/middleware/auth.middleware";

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

function pick<T extends object, K extends keyof T>(
	obj: T,
	keys: readonly K[]
): Pick<T, K> {
	return keys.reduce((acc, k) => {
		if (Object.prototype.hasOwnProperty.call(obj, k))
			(acc as any)[k] = (obj as any)[k];
		return acc;
	}, {} as Pick<T, K>);
}

//Create a new product (store/admin only)
export const createProduct = async (req: AuthRequest, res: Response) => {
	try {
		const product = new Product(req.body);
		await product.save();
		return res.status(201).json(product);
	} catch (err: any) {
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
		const product = await Product.findByIdAndUpdate(
			id,
			{ $set: pick(req.body, ALLOWED_PRODUCT_FIELDS) }, // whitelist fields
			{
				new: true,
				runValidators: true,
				context: "query",
			}
		);
		if (!product)
			return res.status(404).json({ message: "Product not found" });
		return res.status(200).json(product);
	} catch (err: any) {
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
