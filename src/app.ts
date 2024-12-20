import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import {
	ANSWER,
	ICE_CANDIDATE,
	INIT_VIDEO_CALL,
	NEW_MESSAGE,
	NEW_MESSAGE_ALERT,
	OFFER,
	ONLINE_USERS,
	SEND_OFFER,
	START_TYPING,
	START_VIDEO_CALL,
	STOP_TYPING,
	STOP_VIDEO_CALL,
} from "./constants/events.js";
import { getSocketIDs } from "./lib/helper.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { errorMiddleware } from "./middlewares/error.js";
import { Message } from "./models/messageModel.js";
import { connectDB } from "./utils/connectDB.js";

import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { AuthenticatedSocket } from "./types/types.js";
import { rateLimit } from "express-rate-limit";

dotenv.config({ path: "./.env" });

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 3000;
export const userSocketIds = new Map();
const onlineUsers = new Set();

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: [
			"http://localhost:5173",
			"http://localhost:4173",
			process.env.CLIENT_SERVER as string,
		],
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	},
});

app.set("io", io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: [
			"http://localhost:5173",
			"http://localhost:4173",
			process.env.CLIENT_SERVER as string,
		],
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	})
);
app.use(morgan("dev"));
app.use(cookieParser());

connectDB();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis, Memcached, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

app.get("/", (req, res) => {
	res.send("Hello, World!");
});

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/request", requestRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/message", messageRoutes);

app.get("*", (req, res) => {
	res.status(404).json({
		success: false,
		message: "Page not found",
	});
});

io.use((socket: any, next) => {
	cookieParser()(
		socket.request as any,
		socket.request.res as any,
		async (err) => await socketAuthenticator(err, socket, next)
	);
});

io.on("connection", (socket: AuthenticatedSocket) => {
	console.log("A user connected");

	const user = socket.user;

	userSocketIds.set(user._id.toString(), socket.id);

	onlineUsers.add(user._id.toString());

	socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));

	socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
		const messageForRealtime = {
			content: message,
			_id: uuid(),
			sender: {
				_id: user._id,
				name: user.name,
			},
			chat: chatId,
			createdAt: new Date().toISOString(),
		};

		const messageForDB = {
			content: message,
			sender: user._id,
			chat: chatId,
		};

		const membersSocketIds = getSocketIDs(members);

		io.to(membersSocketIds).emit(NEW_MESSAGE, {
			chatId,
			message: messageForRealtime,
		});
		io.to(membersSocketIds).emit(NEW_MESSAGE_ALERT, { chatId });

		try {
			await Message.create(messageForDB);
		} catch (error) {
			console.log(error);
		}
	});

	socket.on(START_TYPING, ({ chatId, members }) => {
		const membersSocketIds = getSocketIDs(members);
		socket.to(membersSocketIds).emit(START_TYPING, { chatId });
	});

	socket.on(STOP_TYPING, ({ chatId, members }) => {
		const membersSocketIds = getSocketIDs(members);
		socket.to(membersSocketIds).emit(STOP_TYPING, { chatId });
	});

	socket.on(ONLINE_USERS, () => {
		socket.emit(ONLINE_USERS, Array.from(onlineUsers));
	});

	socket.on(START_VIDEO_CALL, ({ members, chatId }) => {
		const membersSocketIds = getSocketIDs(members);
		socket
			.to(membersSocketIds)
			.emit(START_VIDEO_CALL, { name: user.name, callChatId: chatId });
	});

	socket.on(STOP_VIDEO_CALL, ({ members }) => {
		const membersSocketIds = getSocketIDs(members);
		socket.to(membersSocketIds).emit(STOP_VIDEO_CALL);
	});

	socket.on(INIT_VIDEO_CALL, ({ members }) => {
		const membersSocketIds = getSocketIDs(members);
		io.to(membersSocketIds).emit(SEND_OFFER);
	});

	socket.on(OFFER, ({ offer, members }) => {
		const membersSocketIds = getSocketIDs(members);
		io.to(membersSocketIds).emit(OFFER, { offer });
	});

	socket.on(ANSWER, ({ answer, members }) => {
		const membersSocketIds = getSocketIDs(members);
		io.to(membersSocketIds).emit(ANSWER, { answer });
	});

	socket.on(ICE_CANDIDATE, ({ candidate, members, type }) => {
		const membersSocketIds = getSocketIDs(members);

		io.to(membersSocketIds).emit(ICE_CANDIDATE, { candidate, type });
	});

	socket.on("disconnect", () => {
		console.log("User disconnected");
		userSocketIds.delete(user._id.toString());
		onlineUsers.delete(user._id.toString());
		socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
	});
});

app.use(errorMiddleware);

server.listen(port, () =>
	console.log("Server is working on Port:" + port + " in " + envMode + " Mode.")
);
