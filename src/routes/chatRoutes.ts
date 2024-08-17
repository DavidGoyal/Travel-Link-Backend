import { Router } from "express";
import {
	deleteChat,
	getAllChats,
	getChatDetails,
} from "../controllers/chatController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const app = Router();

app.use(isAuthenticated);

app.get("/my", getAllChats);
app.route("/:id").get(getChatDetails).delete(deleteChat);

export default app;
