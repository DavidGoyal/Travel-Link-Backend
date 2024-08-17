export const getBase64 = (file: Express.Multer.File) =>
	`data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
