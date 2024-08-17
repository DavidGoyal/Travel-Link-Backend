import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
	acceptFriendRequest,
	deleteNotification,
	getAllNotifications,
	getFriendRequests,
	getRecentActivity,
	getUnreadNotifications,
	markAllAsRead,
	sendFriendRequest,
} from "../controllers/requestController.js";

const app = Router();

app.use(isAuthenticated);

app.post("/new", sendFriendRequest);
app.put("/accept", acceptFriendRequest);
app.delete("/:id", deleteNotification);
app.get("/notifications", getAllNotifications);
app.get("/friends", getFriendRequests);
app.get("/recent", getRecentActivity);
app.put("/read", markAllAsRead);
app.get("/unread", getUnreadNotifications);

export default app;
