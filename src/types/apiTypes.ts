export type RegisterUser = {
	name: string;
	email: string;
	password: string;
	bio: string;
	dob: Date;
	city: string;
	sex: string;
	smoking: boolean;
	alcohol: boolean;
};

export type LoginUser = {
	email: string;
	password: string;
};

export type VerifyUser = {
	id: string;
	token: string;
};

export type UpdateUser = {
	name: string;
	dob: Date;
	city: string;
	sex: string;
	smoking: boolean;
	alcohol: boolean;
};

export type TravellerStatus = {
	destination: string;
	date: string;
	explore?: boolean;
};

export type UpdateRating = {
	rating: number;
	id: string;
};

export type SearchTravellers = {
	age?: number;
	sex?: string;
	destination?: string;
};

export type ApiResponse = {
	success: boolean;
	message: string;
};
