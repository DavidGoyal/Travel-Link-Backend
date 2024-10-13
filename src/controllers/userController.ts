import { compare, hash } from "bcrypt";
import cloudinary from "cloudinary";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { TryCatch } from "../middlewares/error.js";
import { Requests } from "../models/requestModel.js";
import { User } from "../models/userModel.js";
import {
	LoginUser,
	RegisterUser,
	SearchTravellers,
	TravellerStatus,
	UpdateRating,
	UpdateUser,
	VerifyUser,
} from "../types/apiTypes.js";
import { BaseQuery } from "../types/types.js";
import ErrorHandler from "../utils/errorHandler.js";
import { getBase64 } from "../utils/getBase64.js";
import { sendVerificationEMail } from "../utils/sendEmail.js";

export const registerUser = TryCatch(
	async (
		req: Request<{}, {}, RegisterUser>,
		res: Response,
		next: NextFunction
	) => {
		const { name, email, password, dob, sex, city, smoking, alcohol, bio } =
			req.body;

		const photo = req.file;

		if (
			!name ||
			!email ||
			!password ||
			!dob ||
			!sex ||
			!city ||
			!smoking ||
			!alcohol ||
			!bio
		) {
			return next(new ErrorHandler(400, "Please enter all fields"));
		}

		const birthDate = new Date(dob);
		let age = new Date().getFullYear() - birthDate.getFullYear();
		const monthDifference = new Date().getMonth() - birthDate.getMonth();
		if (
			monthDifference < 0 ||
			(monthDifference === 0 && new Date().getDate() < birthDate.getDate())
		) {
			age--;
		}

		if (age < 10) {
			return next(new ErrorHandler(400, "User must be at least 10 years old"));
		}

		if (!photo) {
			return next(new ErrorHandler(400, "Please upload a photo"));
		}

		let user = await User.findOne({ email, isVerified: true });

		if (user) {
			return next(new ErrorHandler(400, "Email already exists"));
		}

		user = await User.findOne({ email, isVerified: false });
		if (user) {
			await cloudinary.v2.uploader.destroy(user.avatar._id);
			await user.deleteOne();
		}

		const verifyToken = Math.floor(Math.random() * 100000)
			.toString()
			.padStart(5, "0");
		const verifyTokenExpiry = new Date(Date.now() + 5 * 60 * 1000);

		const hashedPasssword = await hash(password, 10);

		const result = await cloudinary.v2.uploader.upload(getBase64(photo), {
			folder: "avatar",
		});

		user = await User.create({
			name,
			email,
			bio,
			password: hashedPasssword,
			dob,
			sex,
			city,
			smoking,
			alcohol,
			verifyToken,
			verifyTokenExpiry,
			avatar: {
				_id: result.public_id,
				url: result.secure_url,
			},
		});

		const emailResponse = await sendVerificationEMail(email, verifyToken);

		if (!emailResponse.success) {
			return next(new ErrorHandler(500, "Error sending verification email"));
		}

		return res.status(201).json({
			success: true,
			message: "User registered successfully. Verification email sent.",
			user,
		});
	}
);

export const loginUser = TryCatch(
	async (
		req: Request<{}, {}, LoginUser>,
		res: Response,
		next: NextFunction
	) => {
		const { email, password, cloudflareToken } = req.body;

		if (!email || !password) {
			return next(new ErrorHandler(400, "Please enter all fields"));
		}

		let formData = new FormData();
		formData.append("secret", process.env.SECRET_KEY as string);
		formData.append("response", cloudflareToken);

		const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
		const result = await fetch(url, {
			body: formData,
			method: "POST",
		});
		const challengeSucceeded = (await result.json()).success;

		if (!challengeSucceeded) {
			return next(new ErrorHandler(403, "Invalid reCAPTCHA token"));
		}

		const user = await User.findOne({ email, isVerified: true }).select(
			"+password"
		);

		if (!user) {
			return next(new ErrorHandler(400, "User not found or not verified"));
		}

		const isMatch = await compare(password, user.password);

		if (!isMatch) {
			return next(new ErrorHandler(400, "Invalid email or password"));
		}

		const token = jwt.sign(
			{ _id: user._id },
			process.env.JWT_SECRET as string,
			{
				expiresIn: "7d",
			}
		);

		res
			.status(200)
			.cookie("tripunitetoken", token, {
				maxAge: 7 * 24 * 60 * 60 * 1000,
				httpOnly: true,
				secure: true,
				sameSite: "none",
			})
			.json({
				success: true,
				message: `Welcome back ${user.name}`,
				user: {
					_id: user._id,
					name: user.name,
					email: user.email,
					dob: user.dob,
					sex: user.sex,
					city: user.city,
					smoking: user.smoking,
					alcohol: user.alcohol,
					avatar: user.avatar,
					bio: user.bio,
					isLookingForTraveller: user.isLookingForTraveller,
					rating: user.rating,
				},
			});
	}
);

export const logoutUser = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		res
			.status(200)
			.cookie("tripunitetoken", null, {
				maxAge: 0,
				httpOnly: true,
				secure: true,
				sameSite: "none",
			})
			.json({ success: true, message: "User logged out successfully" });
	}
);

export const verifyUser = TryCatch(
	async (
		req: Request<{}, {}, VerifyUser>,
		res: Response,
		next: NextFunction
	) => {
		const { id, token } = req.body;

		const user = await User.findById(id);

		if (!user) {
			return next(new ErrorHandler(404, "User not found"));
		}

		const isValid =
			user.verifyToken === token &&
			new Date(user.verifyTokenExpiry!) > new Date();

		if (!isValid) {
			return next(new ErrorHandler(401, "Invalid token or token expired"));
		}

		user.isVerified = true;
		user.verifyToken = undefined;
		user.verifyTokenExpiry = undefined;

		await user.save();
		res.status(200).json({
			success: true,
			message: "User verified successfully. Login to continue",
		});
	}
);

export const getProfile = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const id = req.params.id;

		const user = await User.findById(id);

		if (!user) {
			return next(new ErrorHandler(404, "User not found"));
		}

		return res.status(200).json({ success: true, user });
	}
);

export const getMyProfile = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = await User.findById(req.user);

		if (!user) {
			return next(new ErrorHandler(404, "User not found"));
		}

		return res.status(200).json({ success: true, user });
	}
);

export const getPopularUsers = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const users = await User.find({
			isVerified: true,
			isLookingForTraveller: true,
			rating: { $gte: 10 },
		});

		res.status(200).json({ success: true, users });
	}
);

export const updateProfile = TryCatch(
	async (
		req: Request<{}, {}, UpdateUser>,
		res: Response,
		next: NextFunction
	) => {
		const { name, dob, sex, city, smoking, alcohol } = req.body;
		const photo = req.file;

		const user = await User.findById(req.user);

		if (!user) {
			return next(new ErrorHandler(404, "User not found"));
		}

		cloudinary.v2.uploader.destroy(user.avatar._id);

		const result = await cloudinary.v2.uploader.upload(getBase64(photo!), {
			folder: "avatar",
		});

		user.name = name;
		user.dob = dob;
		user.sex = sex;
		user.city = city;
		user.smoking = smoking;
		user.alcohol = alcohol;
		user.avatar = {
			_id: result.public_id,
			url: result.secure_url,
		};

		await user.save();

		res
			.status(200)
			.json({ success: true, message: "Profile updated successfully" });
	}
);

export const updateTravellerStatus = TryCatch(
	async (
		req: Request<{}, {}, TravellerStatus>,
		res: Response,
		next: NextFunction
	) => {
		const { destination, date, explore = false } = req.body;

		const user = await User.findById(req.user);

		if (!user) {
			return next(new ErrorHandler(404, "User not found"));
		}

		if (!explore && user.isLookingForTraveller === true) {
			user.isLookingForTraveller = false;
			user.destination = undefined;
			user.date = undefined;
			await user.save();
		} else {
			if (!destination || !date) {
				return next(
					new ErrorHandler(
						400,
						"Please enter destination place and date of visit"
					)
				);
			}

			const inputDate = new Date(date);

			if (inputDate < new Date())
				return next(
					new ErrorHandler(400, "Date of visit should be in the future")
				);

			user.isLookingForTraveller = true;
			user.destination = destination.toLowerCase();
			user.date = new Date(date);

			await user.save();
		}

		res.status(200).json({
			success: true,
			message: "Traveller status updated successfully",
		});
	}
);

export const updateRating = TryCatch(
	async (
		req: Request<{}, {}, UpdateRating>,
		res: Response,
		next: NextFunction
	) => {
		const { id } = req.body;

		if (!id) {
			return next(new ErrorHandler(404, "Please enter all fields"));
		}

		const existingUser = await User.findById(id);

		if (!existingUser) {
			return next(new ErrorHandler(404, "User not found"));
		}

		let isPresent = false;

		existingUser.reviews &&
			existingUser.reviews.forEach((user) => {
				if (user.toString() === req.user?.toString()) {
					isPresent = true;
				}
			});

		if (!isPresent) {
			if (!existingUser.reviews) {
				existingUser.reviews = [req.user as string];
			} else {
				existingUser.reviews.push(req.user as string);
			}
			existingUser.rating += 1;

			const me = await User.findById(req.user);

			const request = await Requests.findOne({
				requestType: "upvote",
				sender: req.user,
				receiver: existingUser._id,
			});

			if (!request)
				await Requests.create({
					requestType: "upvote",
					sender: req.user,
					receiver: existingUser._id,
				});
		} else {
			existingUser.reviews = existingUser.reviews!.filter(
				(user) => user.toString() !== req.user?.toString()
			);
			existingUser.rating! -= 1;
		}

		await existingUser.save();

		res
			.status(200)
			.json({ success: true, message: "Rating updated successfully" });
	}
);

export const hasUpvotedProfile = TryCatch(
	async (req: Request, res: Response, next: NextFunction) => {
		const id = req.params.id;

		if (!id) {
			return next(new ErrorHandler(404, "Please enter all fields"));
		}

		const existingUser = await User.findById(id);

		if (!existingUser) {
			return next(new ErrorHandler(404, "User not found"));
		}

		let isPresent = false;

		existingUser.reviews &&
			existingUser.reviews.forEach((user) => {
				if (user.toString() === req.user?.toString()) {
					isPresent = true;
				}
			});

		res.status(200).json({ success: true, isPresent });
	}
);

export const searchTravellers = TryCatch(
	async (
		req: Request<{}, {}, {}, SearchTravellers>,
		res: Response,
		next: NextFunction
	) => {
		const { destination, age, sex } = req.query;

		const baseQuery: BaseQuery = {};

		if (destination) {
			baseQuery.destination = { $regex: destination, $options: "i" };
		}

		if (age) {
			baseQuery.dob = {
				$gte: new Date(Date.now() - age * 365 * 24 * 60 * 60 * 1000),
			};
		}

		if (sex) {
			baseQuery.sex = sex;
		}

		const users = await User.find({
			_id: { $ne: req.user },
			isVerified: true,
			isLookingForTraveller: true,
			...baseQuery,
		});

		return res.status(200).json({ success: true, users });
	}
);
