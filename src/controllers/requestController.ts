import { NextFunction, Request, Response } from "express";
import { REFETCH_CHATS } from "../constants/events.js";
import { emitEvent } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chatModel.js";
import { Requests } from "../models/requestModel.js";
import { User } from "../models/userModel.js";
import ErrorHandler from "../utils/errorHandler.js";

export const sendFriendRequest = TryCatch(
	async (
		req: Request<{}, {}, { receiver: string }>,
		res: Response,
		next: NextFunction
	) => {
		const { receiver } = req.body;

		const user = await User.findById(receiver);

		if (!user) {
			return next(new ErrorHandler(400, "User not found"));
		}

		const request = await Requests.findOne({
			$or: [
				{ requestType: "friend", sender: req.user, receiver },
				{ requestType: "friend", sender: receiver, receiver: req.user },
			],
		});

		if (request) {
			return next(new ErrorHandler(400, "Request already sent"));
		}

		const chat = await Chat.findOne({
			members: { $all: [req.user, receiver] },
		});

		if (chat) {
			return next(new ErrorHandler(400, "You are already friends"));
		}

		await Requests.create({
			requestType: "friend",
			sender: req.user,
			receiver,
		});

		return res.status(201).json({
			success: true,
			message: "Request sent successfully",
		});
	}
);

export const acceptFriendRequest = TryCatch(
	async (
		req: Request<{}, {}, { requestId: string; accept: boolean }>,
		res: Response,
		next: NextFunction
	) => {
		const { requestId, accept } = req.body;

		const request = await Requests.findById(requestId);

		if (!request) {
			return next(new ErrorHandler(400, "Request not found"));
		}

		if (request.receiver.toString() !== req.user!.toString()) {
			return next(new ErrorHandler(400, "You are not authorized to do this"));
		}

		const members = [request.sender.toString(), request.receiver.toString()];

		if (accept) {
			await Chat.create({
				members,
			});
		}

		await request.deleteOne();

		await Requests.create({
			requestType: accept ? "accept" : "reject",
			sender: request.receiver,
			receiver: request.sender,
		});

		emitEvent(req, REFETCH_CHATS, members);

		return res.status(200).json({
			success: true,
			message: `Request ${accept ? "accepted" : "rejected"} successfully`,
		});
	}
);

export const deleteNotification = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const { id } = req.params;

		const request = await Requests.findById(id);

		if (!request) {
			return next(new ErrorHandler(400, "Request not found"));
		}

		if (request.receiver.toString() !== req.user!.toString()) {
			return next(new ErrorHandler(400, "You are not authorized to do this"));
		}

		await request.deleteOne();

		return res.status(200).json({
			success: true,
			message: "Notification deleted successfully",
		});
	}
);

export const getAllNotifications = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const requests = await Requests.find({ receiver: req.user })
			.populate("sender", "name avatar")
			.sort({ createdAt: -1 });

		return res.status(200).json({
			success: true,
			requests,
		});
	}
);

export const markAllAsRead = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		await Requests.updateMany(
			{ receiver: req.user, read: false },
			{ read: true }
		);

		return res.status(200).json({
			success: true,
			message: "All notifications marked as read",
		});
	}
);

export const getUnreadNotifications = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const unreadNotifications = await Requests.countDocuments({
			receiver: req.user,
			read: false,
		});

		return res.status(200).json({
			success: true,
			unreadNotifications,
		});
	}
);

export const getFriendRequests = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const requests = await Requests.find({
			receiver: req.user,
			requestType: "friend",
		}).populate("sender", "name avatar dob");

		return res.status(200).json({
			success: true,
			requests,
		});
	}
);

export const getRecentActivity = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const requests = await Requests.find({
			sender: req.user,
		})
			.populate("receiver", "name avatar dob")
			.sort({ createdAt: -1 })
			.limit(4);

		return res.status(200).json({
			success: true,
			requests,
		});
	}
);
