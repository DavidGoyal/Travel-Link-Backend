import mongoose, { Document, Schema } from "mongoose";

const schema = new Schema(
	{
		members: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
		],
	},
	{ timestamps: true }
);

export const Chat = mongoose.models?.Chat || mongoose.model("Chat", schema);
