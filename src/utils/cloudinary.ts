import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param file - Express Multer file object
 * @returns Promise<string> - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (
	file: Express.Multer.File
): Promise<string> => {
	return new Promise((resolve, reject) => {
		// Convert buffer to stream
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "jias-gadgets",
				resource_type: "auto",
				allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
				transformation: [
					{
						width: 1200,
						height: 1200,
						crop: "limit",
						quality: "auto",
						fetch_format: "auto",
					},
				],
			},
			(error, result) => {
				if (error) {
					reject(new Error(`Cloudinary upload failed: ${error.message}`));
				} else if (result?.secure_url) {
					resolve(result.secure_url);
				} else {
					reject(new Error("No URL returned from Cloudinary"));
				}
			}
		);

		// Create readable stream from buffer
		const stream = new Readable();
		stream.push(file.buffer);
		stream.push(null);

		stream.pipe(uploadStream);
	});
};

/**
 * Delete an image from Cloudinary by URL
 * @param imageUrl - The Cloudinary URL of the image to delete
 */
export const deleteFromCloudinary = async (
	imageUrl: string
): Promise<void> => {
	try {
		// Extract public_id from URL
		// Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
		const urlParts = imageUrl.split("/");
		const uploadIndex = urlParts.findIndex((part) => part === "upload");
		if (uploadIndex === -1) return;

		const publicIdParts = urlParts.slice(uploadIndex + 2); // Skip 'upload' and version
		const publicId = publicIdParts
			.join("/")
			.replace(/\.[^/.]+$/, ""); // Remove file extension

		await cloudinary.uploader.destroy(publicId);
	} catch (error) {
		console.error("Failed to delete from Cloudinary:", error);
		// Don't throw - deletion failure shouldn't break the flow
	}
};

export default cloudinary;

