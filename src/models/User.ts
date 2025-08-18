import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
	email: string;
	password: string;
	role: "admin" | "store" | "customer";
	createdAt: Date;
	updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
	{
		email: { type: String, required: true, unique: true, lowercase: true },
		password: { type: String, required: true, minlength: 6 },
		role: {
			type: String,
			enum: ["admin", "store", "customer"],
			default: "store",
		},
	},
	{ timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
