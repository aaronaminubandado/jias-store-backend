import { Router } from "express";
import multer from "multer";
import {
	createProduct,
	deleteProduct,
	getProductById,
	getProducts,
	getProductsByStore,
	updateProduct,
} from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const productRouter = Router();

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
	},
	fileFilter: (req, file, cb) => {
		// Accept only image files
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed"));
		}
	},
});

//Public routes
productRouter.get("/", getProducts);
productRouter.get("/:id", getProductById);

//Protected routes - Store owners can get their own products
productRouter.get(
	"/store/my-products",
	authenticate,
	authorize("store", "admin"),
	getProductsByStore
);

//Protected routes (store/admin only)
productRouter.post(
	"/",
	authenticate,
	authorize("store", "admin"),
	upload.single("image"), // Handle single file upload
	createProduct
);
productRouter.put(
	"/:id",
	authenticate,
	authorize("store", "admin"),
	upload.single("image"), // Handle single file upload
	updateProduct
);
productRouter.delete(
	"/:id",
	authenticate,
	authorize("store", "admin"),
	deleteProduct
);

export default productRouter;
