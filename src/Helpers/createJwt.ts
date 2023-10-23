import { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { ENV } from "../server";

export default function createJwt (payload: User) {
    return jwt.sign({
        id: payload.id,
        name: payload.name,
        email: payload.email
    }, ENV.JWT_SECRET!, {
        expiresIn: "2d"
    })
}