import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { router as apiRouter } from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { env } from "./config/env";
import webhookRouter from "./routes/webhook.route";

export function createApp() {
	const app = express();

    app.use("/api/webhook", webhookRouter);
	//Security
	app.use(helmet());
	app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
	app.use(express.json({ limit: "1mb" }));
	app.use(express.urlencoded({ extended: true }));
	app.use(cookieParser());
	app.use(compression());
	app.use(morgan("dev"));

	//Rate limit
	app.use(
		"/api",
		rateLimit({
			windowMs: 15 * 60 * 1000,
			max: 200,
			standardHeaders: true,
			legacyHeaders: false,
		})
	);

	//Routes
	
	app.use("/api", apiRouter);

	//Global error handler
	app.use(errorHandler);

	return app;
}
