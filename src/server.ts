import { createApp } from "./app";
import { connectDB } from "@/config/db";
import { env } from "@/config/env";

async function main() {
	await connectDB();
	const app = createApp();

	app.listen(env.PORT, () => {
		console.log(`API ready at ${env.APP_URL}:${env.PORT}`);
	});
}

main().catch((err) => {
	console.error("Startup error: ", err);
	process.exit(1);
});
