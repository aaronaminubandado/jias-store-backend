import { Router } from "express";

export const router = Router();

router.get("/health", (_req, res) => {
	res.json({ ok: true, uptime: process.uptime() });
});


//Feature routers
// router.use("/auth",authRouter);
// router.use("/stores",storeRouter);
// router.use("/products",productRouter);