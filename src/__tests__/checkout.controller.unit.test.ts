import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "@/app";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

jest.setTimeout(120000);

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
let app: any;

beforeAll(async () => {
	try {
		mongo = await MongoMemoryServer.create({
			instance: {
				launchTimeout: 30000,
			},
		});

		const uri = mongo.getUri();
		await mongoose.connect(uri, {
			dbName: "jest",
			serverSelectionTimeoutMS: 30000,
			connectTimeoutMS: 30000,
		});

		//Create app instance properly
		app = createApp();
	} catch (error) {
		console.error("Failed to setup test environment:", error);
		throw error;
	}
}, 60000);

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

describe("Checkout session", () => {
	it("creates order and reserves stock", async () => {
		const prod = await Product.create({
			name: "Test",
			price: 10,
			category: "test",
			stock: 5,
			reserved: 0,
		});

		const res = await request(app)
			.post("/api/checkout")
			.send({
				items: [{ id: (prod._id as mongoose.Types.ObjectId).toString(), quantity: 2 }],
			})
			.expect(200);

		expect(res.body.url).toMatch(/http/);

		const updated = await Product.findById(prod._id);
		expect(updated!.reserved).toBe(2);

		const order = await Order.findOne({});
		expect(order).toBeTruthy();
		expect(order!.status).toBe("pending");
		expect(order!.totalAmount).toBe(20);
	}, 30000);

	it("rejects if not enough stock", async () => {
		const prod = await Product.create({
			name: "Test",
			category: "test_category",
			price: 10,
			stock: 1,
			reserved: 0,
		});

		const res = await request(app)
			.post("/api/checkout")
			.send({
				items: [{ id: (prod._id as mongoose.Types.ObjectId).toString(), quantity: 5 }],
			})
			.expect(409);

		expect(res.body.error).toMatch(/Not enough stock/);
	}, 30000);
});
