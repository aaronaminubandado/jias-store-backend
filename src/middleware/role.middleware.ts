import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorize = (...allowedRoles: string[]) => {
	return (req: AuthRequest, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res
				.status(401)
				.json({
					message: "Unauthorized. Unauthenticated user",
					error: "Not authenticated",
				});
		}

		const { role } = req.user;

		if (!allowedRoles.includes(role)) {
			return res
				.status(403)
				.json({
					message: "Forbidden. Insufficient rights.",
					error: "Access denied",
				});
		}

		next();
	};
};
