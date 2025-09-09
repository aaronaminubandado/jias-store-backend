import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp as app } from "@/app";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import stripe from "@/config/stripe";

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

beforeAll(async () => {
	mongo = await MongoMemoryServer.create();
	await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongo.stop();
});

beforeEach(async () => {
	await Product.deleteMany({});
	await Order.deleteMany({});
});

describe("Webhook handler", () => {
	it("marks order paid and decrements stock", async () => {
		const prod = await Product.create({
			name: "Test",
			price: 10,
			stock: 5,
			reserved: 2,
		});

		const order = await Order.create({
			products: [{ product: prod._id, quantity: 2, price: 10 }],
			totalAmount: 20,
			currency: "usd",
			status: "pending",
			checkoutSessionId: "sess_123",
		});

		await request(app)
			.post("/api/webhook")
			.set("Stripe-Signature", "fake")
			.send("{}")
			.expect(200);

		const updatedOrder = await Order.findById(order._id);
		expect(updatedOrder!.status).toBe("paid");

		const updatedProduct = await Product.findById(prod._id);
		expect(updatedProduct!.stock).toBe(3);
		expect(updatedProduct!.reserved).toBe(0);
	});
});
