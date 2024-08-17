import mongoose from "mongoose";

export const connectDB = () => {
	mongoose
		.connect(process.env.MONGO_URL!, { dbName: "tripunite" })
		.then(({ connection }) => console.log(`DB Connected to ${connection.host}`))
		.catch((err) => console.log(err));
};
