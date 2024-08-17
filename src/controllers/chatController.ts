import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chatModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { deletePublicIdFromCloudinary, emitEvent } from "../lib/helper.js";
import { Message } from "../models/messageModel.js";
import { REFETCH_CHATS } from "../constants/events.js";

export const getAllChats = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const chats = await Chat.find({ members: { $in: [req.user] } }).populate(
			"members",
			"name email avatar"
		);

		const transformedChats = chats.map((chat) => {
			const otherMembers = chat.members.filter(
				(member: {
					_id: string;
					name: string;
					email: string;
					avatar: { _id: string; url: string };
				}) => member._id.toString() !== req.user!.toString()
			);

			return {
				_id: chat._id,
				name: otherMembers[0].name,
				avatar: [otherMembers[0].avatar.url],
				members: [otherMembers[0]._id],
			};
		});

		return res.status(200).json({
			success: true,
			chats: transformedChats,
		});
	}
);

export const getChatDetails = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const chat = await Chat.findById(req.params.id);

		if (!chat) {
			return next(new ErrorHandler(404, "Chat does not exists"));
		}

		res.status(200).json({
			success: true,
			chat,
		});
	}
);

export const deleteChat = TryCatch(async (req, res, next) => {
	const chatId = req.params.id;

	const chat = await Chat.findById(chatId);

	if (!chat) {
		return next(new ErrorHandler(404, "Chat does not exists"));
	}

	const members = chat.members;

	const messagesWithAttachments = await Message.find({
		chat: chatId,
		attachments: { $exists: true, $ne: [] },
	});

	const public_ids = messagesWithAttachments.map(({ attachments }) =>
		attachments.map(({ public_id }: { public_id: string }) => public_id)
	);

	await Promise.all([
		deletePublicIdFromCloudinary(public_ids),
		chat.deleteOne(),
		Message.deleteMany({ chat: chatId }),
	]);

	emitEvent(req, REFETCH_CHATS, members);

	res.status(200).json({
		success: true,
		message: "Chat deleted successfully",
	});
});
