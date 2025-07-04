import { NextFunction, Request, Response } from "express";
import HttpError from "../Helpers/HttpError";
import HttpResponse from "../Helpers/HttpResponse";
import { AcceptRequestSchema, RemoveFriendSchema, SendRequestByMatchId, SendRequestSchema } from "../Schemas/FriendsSchema";
import prisma from "../db";

export async function sendRequest(req: Request, res: Response, next: NextFunction) {
    const { email } = await SendRequestSchema.parseAsync(req.body);
    if (!req.decoded?.id) throw HttpError.InternalServerError("Algo deu errado, tente recarregar a página")
    if (req.decoded.email === email) throw HttpError.BadRequest("Você não pode enviar uma solicitação de amizade para você mesmo")
    const friend = await prisma.user.findUnique({ where: { email } });
    if (!friend) throw HttpError.BadRequest("Usuário não encontrado")

    const request = await prisma.friend.findFirst({
        where: {
            OR: [
                { userId: req.decoded.id, friendId: friend.id },
                { userId: friend.id, friendId: req.decoded.id }
            ]
        }
    })
    if (request?.status === "ACCEPTED") throw HttpError.BadRequest("Você já é amigo dessa pessoa")
    if (request) throw HttpError.BadRequest("Já existe uma solicitação de amizade entre vocês")

    const data = await prisma.friend.create({
        data: {
            userId: req.decoded.id,
            friendId: friend.id,
            status: "PENDING"
        }
    })

    return HttpResponse.Ok(data)
}

export async function acceptRequest(req: Request, res: Response, next: NextFunction) {
    const { userId } = await AcceptRequestSchema.parseAsync(req.params);
    if (!req.decoded?.id) throw HttpError.InternalServerError("Algo deu errado, tente recarregar a página")
    const request = await prisma.friend.findFirst({
        where: {
            OR: [
                { userId: req.decoded.id, friendId: Number(userId) },
                { userId: Number(userId), friendId: req.decoded.id }
            ]
        }
    });
    if (!request) throw HttpError.BadRequest("Solicitação de amizade não encontrada")
    if (request.status === "ACCEPTED") throw HttpError.BadRequest("Você já é amigo dessa pessoa")
    if (request.friendId !== req.decoded.id) throw HttpError.BadRequest("Você não pode aceitar uma solicitação de amizade que não é para você")

    const data = await prisma.friend.update({
        where: { userId_friendId:{
            userId: request.userId,
            friendId: request.friendId
        } },
        data: { status: "ACCEPTED" }
    })

    return HttpResponse.Ok(data)
}

export async function index(req: Request, res: Response, next: NextFunction) {
    if(!req.decoded?.id) throw HttpError.InternalServerError("Algo deu errado, tente recarregar a página")

    const friends = await prisma.$queryRaw`
        select 
            CASE
                WHEN "userId" = ${req.decoded.id} THEN "friendId"
                WHEN "friendId" = ${req.decoded.id} THEN "userId"
            END AS "id",
            "userId" as "requesterId",
            "status",
            "name",
            "email"
        
        from "Friend" 
        inner join "User" on "User"."id" = CASE
            WHEN "userId" = ${req.decoded.id} THEN "friendId"
            WHEN "friendId" = ${req.decoded.id} THEN "userId"
        END
        where ("userId" = ${req.decoded.id} OR "friendId" = ${req.decoded.id})
    `
    return HttpResponse.Ok(friends ?? [])
}

export async function sendRequestByMatchId(req: Request, res: Response, next: NextFunction) {
    const { matchId } = await SendRequestByMatchId.parseAsync(req.body);
    if (!req.decoded?.id) throw HttpError.InternalServerError("Algo deu errado, tente recarregar a página")
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw HttpError.BadRequest("Partida não encontrada")
    if(match.user1Id != req.decoded.id && match.user2Id != req.decoded.id) throw HttpError.BadRequest("Você não pode enviar uma solicitação de amizade para uma partida que você não participou")
    const friendId = match.user1Id === req.decoded.id ? match.user2Id : match.user1Id;
    const request = await prisma.friend.findFirst({
        where: {
            OR: [
                { userId: req.decoded.id, friendId },
                { userId: friendId, friendId: req.decoded.id }
            ]
        }
    })
    if (request?.status === "ACCEPTED") throw HttpError.BadRequest("Você já é amigo dessa pessoa")
    if (request) throw HttpError.BadRequest("Já existe uma solicitação de amizade entre vocês")

    const data = await prisma.friend.create({
        data: {
            userId: req.decoded.id,
            friendId,
            status: "PENDING"
        }
    })

    return HttpResponse.Ok(data)
}


export async function remove(req: Request, res: Response, next: NextFunction) {
    const { userId } = await RemoveFriendSchema.parseAsync(req.params);
    if (!req.decoded?.id) throw HttpError.InternalServerError("Algo deu errado, tente recarregar a página")
    const request = await prisma.friend.findFirst({
        where: {
            OR: [
                { userId: req.decoded.id, friendId: Number(userId) },
                { userId: Number(userId), friendId: req.decoded.id }
            ]
        }
    });
    if (!request) throw HttpError.BadRequest("Amizade não encontrada")
    if (request.friendId !== req.decoded.id && request.userId !== req.decoded.id) throw HttpError.BadRequest("Você não pode remover uma amizade que não é sua");
    
    const data = await prisma.friend.delete({
        where: { userId_friendId:{
            userId: request.userId,
            friendId: request.friendId
        } },
    })

    return HttpResponse.Ok(data)
}