import { Request, Response } from "express";
import User from "@/models/User";
import { hashPassword, comparePassword } from "@/utils/hashPassword";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export const register = async (req: Request, res: Response) => {
	const { email, password, role } = req.body;

	try {
		const existingUser = await User.findOne({ email });
		if (existingUser)
			return res.status(400).json({ error: "User already exists" });

		const hashedPassword = await hashPassword(password);
		const user = new User({ email, password: hashedPassword, role });
		await user.save();

		const token = jwt.sign(
			{ id: user._id, role: user.role },
			env.JWT_SECRET,
			{ expiresIn: "2h" }
		);
		res.status(201).json({ token, email: user.email, role: user.role });
	} catch (err) {
		res.status(500).json({
			message: "Registration failed",
			error: "Server error",
		});
	}
};
