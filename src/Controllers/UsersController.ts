import { NextFunction, Request, Response } from "express";
import HttpError from "../Helpers/HttpError";
import HttpResponse from "../Helpers/HttpResponse";

import { LoginSchema, RegisterSchema } from "../Schemas/UsersSchema";
import prisma from "../db";
import createJwt from "../Helpers/createJwt";


export async function login(req: Request, res: Response, next: NextFunction) {
    const { body } = await LoginSchema.parseAsync(req);

    const User = await prisma.user.findUnique({
        where: {
            email: body.email
        }
    })

    if (!User) throw HttpError.Unauthorized("Credenciais Inválidas");

    const isMatch = await Bun.password.verify(body.password, User.password);
    if (!isMatch) throw HttpError.Unauthorized("Credenciais Inválidas");

    return HttpResponse.Ok({
        ...User,
        token: createJwt(User),
        password: undefined
    })
}

export async function register(req: Request, res: Response, next: NextFunction) {
    const { body } = await RegisterSchema.parseAsync(req);
    
    if(body.password !== body.confirmPassword) throw HttpError.BadRequest("Senhas não coincidem");

    const User = await prisma.user.create({
        data: {
            name: body.name,
            email: body.email,
            password: await Bun.password.hash(body.password),
            rating: 1000
        },
    }).catch(e => {
        if (e.code === "P2002") throw HttpError.BadRequest("Email já existente");
        throw e;
    })

    return HttpResponse.Ok({
        ...User,
        token: createJwt(User),
        password: undefined
    })
}

export async function getRating(req: Request, res: Response, next: NextFunction) {
    const User = await prisma.user.findUnique({
        where: {
            id: req.decoded?.id
        }
    })

    if (!User) throw HttpError.NotFound("Usuário não encontrado");

    return HttpResponse.Ok({
        rating: User.rating
    })
}