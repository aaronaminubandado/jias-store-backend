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

