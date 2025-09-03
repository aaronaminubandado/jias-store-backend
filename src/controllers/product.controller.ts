import { Request, Response } from "express";
import { Product } from "@/models/Product";
import { AuthRequest } from "@/middleware/auth.middleware";

//Create a new product (store/admin only)
export const createProduct = async (req: AuthRequest, res: Response) => {
	try {
		const product = new Product(req.body);
		await product.save();
		return res.status(201).json(product);
	} catch (err: any) {
		return res.status(400).json({ message: err.message });
	}
};

//Get all products (public)
export const getProducts = async (_req: Request, res: Response) => {
	try {
		const products = await Product.find();
		return res.status(200).json({ products });
	} catch (err: any) {
		return res.status(500).json({ message: err.message });
	}
};

//Get a single product by ID (public)
export const getProductById = async (_req: Request, res: Response) => {
	try {
		const product = await Product.findById(_req.params.id);
		if (!product)
			return res.status(404).json({ message: "Product not found" });
		return res.status(200).json(product);
	} catch (err: any) {
		return res.status(500).json({ message: err.message });
	}
};

//Update product by ID (store/admin)
export const updateProduct = async (_req: AuthRequest, res: Response) => {
	try {
		const product = await Product.findByIdAndUpdate(
			_req.params.id,
			_req.body,
			{
				new: true,
				runValidators: true,
			}
		);
		if (!product)
			return res.status(404).json({ message: "Product not found" });
		return res.status(200).json(product);
	} catch (err: any) {
		return res.status(400).json({ message: err.message });
	}
};
