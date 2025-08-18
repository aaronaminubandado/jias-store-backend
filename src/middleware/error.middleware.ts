import { NextFunction, Request, Response } from "express";

export function errorHandler(
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction
) {
	const status = err.status || 500;
	const message =
		status === 500 ? "Internal Server Error" : err.message || "Error";
	if (status === 500) {
		console.error(err);//Log error on server
	}
	res.status(status).json({ error: message });
}
