import { NextFunction, Request, Response } from "express";
import HttpError from "../Helpers/HttpError";
import HttpResponse from "../Helpers/HttpResponse";
import prisma from "../db";


export async function index(req: Request, res: Response, next: NextFunction) {
    
    const users = await prisma.user.findMany({
        orderBy: {
            rating: "desc"
        },
        select: {
            id: true,
            name: true,
            rating: true
        },
        take: 10
    });

    return HttpResponse.Ok(users);
}
