import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { ApiResponse } from "../types/apiTypes.js";
import nodeMailer from "nodemailer";

export async function sendVerificationEMail(
	email: string,
	verifyToken: string
): Promise<ApiResponse> {
	try {
		const transporter = nodeMailer.createTransport({
			host: "smtp.gmail.com",
			port: process.env.SMTP_PORT,
			secure: true,
			service: process.env.SMTP_SERVICE,
			auth: {
				user: process.env.SMTP_MAIL,
				pass: process.env.APP_PASSWORD,
			},
		} as SMTPTransport.Options);

		const mailOptions = {
			from: "Trip Unite",
			to: email,
			subject: "Trip Unite - Verification Code",
			text: `Hello,
		
		Thank you for joining Trip Unite! To complete your registration, please verify your email address by using the following verification code:
		
		${verifyToken}
		
		If you did not sign up for Trip Unite, please disregard this email.
		
		Safe travels,
		The Trip Unite Team`,
		};

		transporter.sendMail(mailOptions, function (err, data) {
			if (err) {
				console.log(err);
				return { success: true, message: "Failed to Send Verification Email" };
			}
		});
		return { success: true, message: "Verification email sent successfully" };
	} catch (error) {
		return { success: false, message: "Failed to Send Verification Email" };
	}
}
