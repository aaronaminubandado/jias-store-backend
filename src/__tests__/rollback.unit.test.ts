import { Product } from "@/models/Product";

jest.setTimeout(100000); 
jest.mock("@/models/Product");

const mockedProduct = Product as jest.Mocked<typeof Product>;

//Import rollback reserved from main code
async function rollbackReserved(
	reservedOps: { id: string; quantity: number }[]
) {
	for (const op of reservedOps) {
		await Product.findOneAndUpdate(
			{ _id: op.id, reserved: { $gte: op.quantity } },
			{ $inc: { reserved: -op.quantity } }
		);
	}
}

describe("rollbackReserved", () => {
	it("should revert only reservedOps with reserved >= qty", async () => {
		mockedProduct.findOneAndUpdate.mockResolvedValueOnce({});

		await rollbackReserved([{ id: "abc", quantity: 2 }]);

		expect(mockedProduct.findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: "abc", reserved: { $gte: 2 } },
			{ $inc: { reserved: -2 } }
		);
	});
});
