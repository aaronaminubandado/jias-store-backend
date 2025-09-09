import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "@/app";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

jest.mock("@/config/stripe", () => ({
	checkout: {
		sessions: {
			create: jest.fn().mockResolvedValue({
				id: "sess_123",
				url: "http://stripe.test",
			}),
		},
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

describe("Checkout session", () => {
	it("creates order and reserves stock", async () => {
		const prod = await Product.create({
			name: "Test",
			price: 10,
			stock: 5,
			reserved: 0,
		});

		const res = await request(createApp)
			.post("/api/checkout/session")
			.send({ items: [{ id: (prod._id as string).toString(), quantity: 2 }] })
			.expect(200);

		expect(res.body.url).toMatch(/http/);

		const updated = await Product.findById(prod._id);
		expect(updated!.reserved).toBe(2);

		const order = await Order.findOne({});
		expect(order).toBeTruthy();
		expect(order!.status).toBe("pending");
		expect(order!.totalAmount).toBe(20);
	});

	it("rejects if not enough stock", async () => {
		const prod = await Product.create({
			name: "Test",
			price: 10,
			stock: 1,
			reserved: 0,
		});

		const res = await request(createApp)
			.post("/api/checkout/session")
			.send({ items: [{ id: (prod._id as string).toString(), quantity: 5 }] })
			.expect(409);

		expect(res.body.error).toMatch(/Not enough stock/);
	});
});
