import { env } from "@/config/env";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
	user?: { id: string; role: string };
}

export const authenticate = (
	req: AuthRequest,
	res: Response,
	next: NextFunction
) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ message: "Unauthorized. Token missing or malformed." });
	}

	const token = authHeader.split(" ")[1];

	try {
		const secret = env.JWT_SECRET;
		const decoded = jwt.verify(token, secret) as {
			id: string;
			role: string;
		};
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(403).json({ message: "Forbidden. Invalid token." });
	}
};
