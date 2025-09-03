import { Router } from "express";
import {
	createProduct,
	getProductById,
	getProducts,
} from "@/controllers/product.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { authorize } from "@/middleware/role.middleware";

const productRouter = Router();

//Public routes
productRouter.get("/", getProducts);
productRouter.get("/:id", getProductById);

//Protected routes (store/admin only)
productRouter.post(
	"/",
	authenticate,
	authorize("store", "admin"),
	createProduct
);

export default productRouter;
