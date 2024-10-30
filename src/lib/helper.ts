import { v2 as cloudinary } from "cloudinary";
import { Request } from "express";
import { v4 as uuid } from "uuid";
import { userSocketIds } from "../app.js";
import { getBase64 } from "../utils/getBase64.js";

type Result = {
	public_id: string;
	secure_url: string;
};

export const emitEvent = (
	req: Request,
	event: string,
	users: string[],
	data = {}
) => {
	const io = req.app.get("io");

	const usersSockets = getSocketIDs(users);

	io.to(usersSockets).emit(event, data);
};

export const getSocketIDs = (users: string[]) => {
	try {
		const socketIds = users.map((user) => userSocketIds.get(user.toString()));

		return socketIds;
	} catch (error) {
		console.log(error);
		return [];
	}
};

export const uploadFilesToCloudinary = async (files = []) => {
	const uploadPromises = files.map((file) => {
		return new Promise((resolve, reject) => {
			cloudinary.uploader.upload(
				getBase64(file),
				{
					resource_type: "auto",
					public_id: uuid(),
				},
				(err, result) => {
					if (err) {
						reject(err);
					} else {
						resolve(result);
					}
				}
			);
		});
	});
	try {
		const results: Result[] = (await Promise.all(uploadPromises)) as Result[];
		const formattedResults = results.map((result) => {
			return {
				public_id: result.public_id,
				url: result.secure_url,
			};
		});
		return formattedResults;
	} catch (error) {
		throw new Error("Failed to upload files to Cloudinary");
	}
};

export const deletePublicIdFromCloudinary = async (publicIds: string[]) => {
	for (let index = 0; index < publicIds.length; index++) {
		await cloudinary.uploader.destroy(publicIds[index]);
	}
};
