import "dotenv/config";

function required(name: string, fallback?: string) {
	const v = process.env[name] ?? fallback;
	if (!v) throw new Error(`Missing required env var: ${name}`);
	return v;
}

export const env = {
	APP_URL: process.env.APP_URL || "http://localhost",
	NODE_ENV: process.env.NODE_ENV || "development",
	PORT: Number(process.env.PORT || 5000),
	FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5137",
	MONGODB_URI: required("MONGODB_URI", "mongodb://127.0.0.1:27017/jiastore"),
	JWT_SECRET:
		process.env.NODE_ENV === "production"
			? required("JWT_SECRET")
			: process.env.JWT_SECRET ??
			  "dev_json_web_secret_wefjidjkcdjkrqjicne",
	// enforce presence of Stripe secrets in production; else allow empty/default for dev/test
	STRIPE_SECRET_KEY:
		process.env.NODE_ENV === "production"
			? required("STRIPE_SECRET_KEY")
			: process.env.STRIPE_SECRET_KEY ?? "",
	STRIPE_WEBHOOK_SECRET:
		process.env.NODE_ENV === "production"
			? required("STRIPE_WEBHOOK_SECRET")
			: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
