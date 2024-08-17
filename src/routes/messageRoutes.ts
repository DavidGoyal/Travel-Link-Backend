import { Router } from "express";
import {
	getMessages,
	sendAttachments,
} from "../controllers/messageController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";

const app = Router();

app.use(isAuthenticated);

app.post("/attachments", attachmentsMulter, sendAttachments);
app.route("/:id").get(getMessages);

export default app;
