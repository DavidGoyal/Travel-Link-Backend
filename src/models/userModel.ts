import mongoose, { Document, Schema } from "mongoose";

export interface UserModel extends Document {
	name: string;
	password: string;
	email: string;
	avatar: {
		_id: string;
		url: string;
	};
	bio: string;
	dob: Date;
	sex: string;
	city: string;
	smoking: boolean;
	alcohol: boolean;
	destination?: string;
	date?: Date;
	rating: number;
	verifyToken?: string;
	verifyTokenExpiry?: Date;
	isVerified: boolean;
	isLookingForTraveller: boolean;
	reviews: string[];
	_id: string;
}

const schema: Schema<UserModel> = new Schema(
	{
		name: {
			type: String,
			required: [true, "Please enter your name"],
			min: [5, "Minimum characters should be 5"],
			max: [20, "Maximum characters should be 20"],
			match: [/^[a-zA-Z\s]+$/, "Username can only contain letters and spaces"],
		},
		bio: {
			type: String,
			required: [true, "Please enter your bio"],
			min: [10, "Minimum characters should be 10"],
			max: [200, "Maximum characters should be 200"],
		},
		password: {
			type: String,
			required: [true, "Please enter password"],
			select: false,
			min: [8, "Minimum characters should be 8"],
		},
		email: {
			type: String,
			required: [true, "Please enter email"],
			unique: true,
			match: [/.+\@.+\../, "Please enter a valid email"],
		},
		avatar: {
			_id: {
				type: String,
				required: true,
			},
			url: {
				type: String,
				required: true,
			},
		},
		dob: {
			type: Date,
			required: [true, "Please enter your date of birth"],
		},
		sex: {
			type: String,
			required: [true, "Please enter your sex"],
			enum: ["male", "female"],
		},
		city: {
			type: String,
			required: [true, "Please enter your city"],
		},
		smoking: {
			type: Boolean,
			required: [true, "Please enter your smoking status"],
		},
		alcohol: {
			type: Boolean,
			required: [true, "Please enter your alcohol status"],
		},
		destination: String,
		date: Date,
		rating: {
			type: Number,
			default: 0,
		},
		verifyToken: String,
		verifyTokenExpiry: Date,
		isVerified: {
			type: Boolean,
			default: false,
		},
		isLookingForTraveller: {
			type: Boolean,
			default: false,
		},
		reviews: [String],
	},
	{ timestamps: true }
);

export const User =
	(mongoose.models?.User as mongoose.Model<UserModel>) ||
	mongoose.model<UserModel>("User", schema);
