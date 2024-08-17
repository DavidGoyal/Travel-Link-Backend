import { Socket } from "socket.io";

export type BaseQuery = {
	destination?: {
		$regex: string;
		$options: string;
	};
	dob?: {
		$gte: Date;
	};
	sex?: string;
};

export interface EmitUserType {
	name?: string;
	password?: string;
	email?: string;
	avatar?: {
		_id: string;
		url: string;
	};
	age?: number;
	sex?: string;
	city?: string;
	smoking?: boolean;
	alcohol?: boolean;
	destination?: string;
	date?: Date;
	rating?: number;
	verifyToken?: string;
	verifyTokenExpiry?: Date;
	isVerified?: boolean;
	isLookingForTraveller?: boolean;
	reviews?: string[];
	_id: string;
}

export interface AuthenticatedSocket extends Socket {
	user?: any;
}
