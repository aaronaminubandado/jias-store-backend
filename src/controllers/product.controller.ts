import { Request, Response } from "express";
import { isValidObjectId, Error as MongooseError } from "mongoose";
import { Product } from "../models/Product";
import { AuthRequest } from "../middleware/auth.middleware";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";

const ALLOWED_PRODUCT_FIELDS = [
	"name",
	"description",
	"price",
	"image",
	"category",
	"stock",
	"sku",
	"brand",
	"tags",
	"featured",
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
export const getProducts = async (req: Request, res: Response) => {
	try {
		const products = await Product.find().populate("store", "email");
		return res.status(200).json(products);
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error" });
	}
};

// Get products by store (for store owners)
export const getProductsByStore = async (req: AuthRequest, res: Response) => {
	try {
		const user = req.user;
		if (!user) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		// Store owners can only see their own products
		// Admins can see all products
		const query =
			user.role === "store" ? { store: user.id } : {};

		const products = await Product.find(query)
			.populate("store", "email")
			.sort({ createdAt: -1 });

		return res.status(200).json(products);
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error" });
	}
};

//Create a new product (store/admin only)
export const createProduct = async (req: AuthRequest, res: Response) => {
	try {
		let imageUrl = req.body.image; // Fallback to URL if provided

		// If file uploaded, upload to Cloudinary
		if (req.file) {
			try {
				imageUrl = await uploadToCloudinary(req.file);
			} catch (uploadError: any) {
				return res.status(400).json({
					message: "Image upload failed",
					error: uploadError.message,
				});
			}
		}

		// Parse JSON fields if they're strings (from FormData)
		const payload: any = {};
		for (const key of ALLOWED_PRODUCT_FIELDS) {
			if (req.body[key] !== undefined) {
				// Try to parse as JSON if it looks like JSON
				if (
					typeof req.body[key] === "string" &&
					(req.body[key].startsWith("{") ||
						req.body[key].startsWith("[") ||
						req.body[key] === "true" ||
						req.body[key] === "false")
				) {
					try {
						payload[key] = JSON.parse(req.body[key]);
					} catch {
						payload[key] = req.body[key];
					}
				} else {
					payload[key] = req.body[key];
				}
			}
		}

		// Add image URL
		if (imageUrl) {
			payload.image = imageUrl;
		}

		// Add store ID if user is a store owner
		if (req.user?.role === "store") {
			payload.store = req.user.id;
		}

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

		// Check if product exists and user has permission
		const existingProduct = await Product.findById(id);
		if (!existingProduct) {
			return res.status(404).json({ message: "Product not found" });
		}

		// Store owners can only update their own products
		if (
			req.user?.role === "store" &&
			existingProduct.store &&
			String(existingProduct.store) !== String(req.user.id)
		) {
			return res.status(403).json({
				message: "You can only update your own products",
			});
		}

		const update: any = {};

		// Handle image upload
		if (req.file) {
			try {
				// Delete old image if it exists
				if (existingProduct.image) {
					await deleteFromCloudinary(existingProduct.image);
				}
				update.image = await uploadToCloudinary(req.file);
			} catch (uploadError: any) {
				return res.status(400).json({
					message: "Image upload failed",
					error: uploadError.message,
				});
			}
		} else if (req.body.image !== undefined) {
			// If image URL provided, use it
			update.image = req.body.image;
		}

		// Parse other fields
		for (const key of ALLOWED_PRODUCT_FIELDS) {
			if (req.body[key] !== undefined && key !== "image") {
				if (
					typeof req.body[key] === "string" &&
					(req.body[key].startsWith("{") ||
						req.body[key].startsWith("[") ||
						req.body[key] === "true" ||
						req.body[key] === "false")
				) {
					try {
						update[key] = JSON.parse(req.body[key]);
					} catch {
						update[key] = req.body[key];
					}
				} else {
					update[key] = req.body[key];
				}
			}
		}

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

		const product = await Product.findById(id);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// Store owners can only delete their own products
		if (
			req.user?.role === "store" &&
			product.store &&
			String(product.store) !== String(req.user.id)
		) {
			return res.status(403).json({
				message: "You can only delete your own products",
			});
		}

		// Delete image from Cloudinary if it exists
		if (product.image) {
			await deleteFromCloudinary(product.image);
		}

		await Product.findByIdAndDelete(id);

		return res.status(204).send();
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error" });
	}
};
