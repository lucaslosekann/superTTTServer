import { User } from "@prisma/client";
import { env } from "bun";
import jwt from "jsonwebtoken";

export default function createJwt (payload: User) {
    return jwt.sign({
        id: payload.id,
        name: payload.name,
        email: payload.email
    }, env.JWT_SECRET!, {
        expiresIn: "2d"
    })
}