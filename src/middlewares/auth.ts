import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import ErrorHandler from "../utils/errorHandler.js";

export const isAuthenticated = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const token = req.cookies["tripunitetoken"];

	if (!token) {
		return next(new ErrorHandler(401, "Please login to access this resource"));
	}

	const decodedId = jwt.verify(token, process.env.JWT_SECRET!) as {
		_id: string;
	};

	req.user = decodedId._id;
	next();
};

export const socketAuthenticator = async (
	err: any,
	socket: any,
	next: (err?: ErrorHandler) => void
) => {
	try {
		if (err)
			return next(
				new ErrorHandler(401, "Please login to access this resource")
			);

		const token = socket.request.cookies["tripunitetoken"];

		if (!token) {
			return next(
				new ErrorHandler(401, "Please login to access this resource")
			);
		}

		const decodedId = jwt.verify(token, process.env.JWT_SECRET!) as {
			_id: string;
		};

		const user = await User.findById(decodedId._id);

		if (!user)
			return next(
				new ErrorHandler(401, "Please login to access this resource")
			);

		socket.user = user;

		return next();
	} catch (error) {
		return next(new ErrorHandler(401, "Please login to access this resource"));
	}
};
