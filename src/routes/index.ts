import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import productRouter from "./product.routes";

export const router = Router();

router.get("/health", (_req, res) => {
	res.json({ ok: true, uptime: process.uptime() });
});

//Feature routers
router.use("/auth", authRoutes);
// router.use("/stores",storeRouter);
router.use("/products",productRouter);
