import { Router } from "express";
import { createProduct, getProducts } from "@/controllers/product.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { authorize } from "@/middleware/role.middleware";

const productRouter = Router();

//Public routes
productRouter.get("/", getProducts);

//Protected routes (store/admin only)
productRouter.post(
	"/",
	authenticate,
	authorize("store", "admin"),
	createProduct
);

export default productRouter;
