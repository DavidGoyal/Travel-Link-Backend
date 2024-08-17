import { Router } from "express";
import {
	getMyProfile,
	getPopularUsers,
	getProfile,
	hasUpvotedProfile,
	loginUser,
	logoutUser,
	registerUser,
	searchTravellers,
	updateProfile,
	updateRating,
	updateTravellerStatus,
	verifyUser,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { singleUpload } from "../middlewares/multer.js";

const app = Router();

app.post("/register", singleUpload, registerUser);
app.post("/login", loginUser);
app.put("/verify", verifyUser);

app.use(isAuthenticated);
app.get("/logout", logoutUser);
app.get("/profile/:id", getProfile);
app.get("/my", getMyProfile);

app.get("/popular", getPopularUsers);
app.put("/update", updateProfile);
app.put("/travel", updateTravellerStatus);
app.put("/rating", updateRating);
app.get("/upvoted/:id", hasUpvotedProfile);
app.get("/search", searchTravellers);

export default app;
