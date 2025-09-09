import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "@/app";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

jest.setTimeout(120000);

jest.mock("@/config/stripe", () => ({
	webhooks: {
		constructEvent: jest
			.fn()
			.mockImplementation((_body, _sig, _secret) => ({
				id: "evt_1",
				type: "checkout.session.completed",
				data: {
					object: {
						id: "sess_123",
						payment_status: "paid",
					},
				},
			})),
	},
}));

let mongo: MongoMemoryServer;
let app: any;

beforeAll(async () => {
	try {
		// Increase timeout for MongoMemoryServer
		mongo = await MongoMemoryServer.create({
			instance: {
				// Increase startup timeout
				launchTimeout: 30000,
			},
		});

		const uri = mongo.getUri();
		await mongoose.connect(uri, {
			dbName: "jest",
			serverSelectionTimeoutMS: 30000,
			connectTimeoutMS: 30000,
		});

		// Create app instance once
		app = createApp();
	} catch (error) {
		console.error("Failed to setup test environment:", error);
		throw error;
	}
}, 60000); // 60 second timeout for setup

afterAll(async () => {
	try {
		if (mongoose.connection.readyState !== 0) {
			await mongoose.connection.dropDatabase();
			await mongoose.connection.close();
		}
		if (mongo) {
			await mongo.stop();
		}
	} catch (error) {
		console.error("Error during cleanup:", error);
	}
}, 30000);

beforeEach(async () => {
	if (mongoose.connection.readyState === 1) {
		await Product.deleteMany({});
		await Order.deleteMany({});
	}
});

describe("Webhook handler", () => {
	it("marks order paid and decrements stock", async () => {
		const prod = await Product.create({
			name: "Test Product",
			category: "test_category",
			price: 10,
			stock: 5,
			reserved: 2,
			description: "Test description",
		});

		const order = await Order.create({
			products: [{ product: prod._id, quantity: 2, priceCents: 10 }],
			totalAmount: 20,
			currency: "usd",
			status: "pending",
			checkoutSessionId: "sess_123",
		});

		const response = await request(app)
			.post("/api/webhook")
			.set("Stripe-Signature", "fake")
			.send("{}")
			.expect(200);

		const updatedOrder = await Order.findById(order._id);
		expect(updatedOrder!.status).toBe("paid");

		const updatedProduct = await Product.findById(prod._id);
		expect(updatedProduct!.stock).toBe(3);
		expect(updatedProduct!.reserved).toBe(0);
	}, 30000); // 30 second timeout for this specific test
});
