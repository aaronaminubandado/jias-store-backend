import bcrypt from "bcrypt";

//Hash password with a salt
export async function hashPassword(password: string): Promise<string> {
	const saltRounds = 10;
	const hashedPassword = await bcrypt.hash(password, saltRounds);
	return hashedPassword;
}

//Compare password
export async function comparePassword(
	password: string,
	hash: string
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}
