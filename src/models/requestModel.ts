import mongoose, { Document, Schema } from "mongoose";

type user = {
	type: Schema.Types.ObjectId;
	ref: "User";
};

interface RequestModel extends Document {
	requestType: string;
	sender: user;
	receiver: user;
	read: boolean;
}

const schema: Schema<RequestModel> = new Schema(
	{
		requestType: {
			type: String,
			required: true,
		},
		sender: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		receiver: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		read: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

export const Requests =
	(mongoose.models?.Requests as mongoose.Model<RequestModel>) ||
	mongoose.model<RequestModel>("Requests", schema);
