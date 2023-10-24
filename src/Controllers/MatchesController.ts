import { NextFunction, Request, Response } from "express";
import HttpError from "../Helpers/HttpError";
import HttpResponse from "../Helpers/HttpResponse";
import prisma from "../db";
import { GetMatchSchema } from "../Schemas/MatchesSchema";


export async function getLastMatches(req: Request, res: Response, next: NextFunction) {
    const userId = req.decoded?.id!;

    const matches = await prisma.$queryRaw`
    SELECT
        M.id AS match_id,
        CASE
            WHEN M."user1Id" = ${userId} THEN U2.name
            WHEN M."user2Id" = ${userId} THEN U1.name
        END AS opponent_name,
        M."winnerId",
        M."creationDate",
        M."endDate"
    FROM
        "Match" AS M
    LEFT JOIN
        "User" AS U1 ON M."user1Id" = U1.id
    LEFT JOIN
        "User" AS U2 ON M."user2Id" = U2.id
    WHERE
        M."user1Id" = ${userId} OR M."user2Id" = ${userId}
    ORDER BY
        M."creationDate" DESC
    LIMIT 10;
    `;


    return HttpResponse.Ok(matches ?? []);
}

export async function get(req: Request, res: Response, next: NextFunction) {
    const { id } = await GetMatchSchema.parseAsync(req.params);

    const match = await prisma.match.findUnique({
        where: {
            id: Number(id)
        },
        include: {
            movements: {
                select: {
                    i: true,
                    j: true,
                    k: true,
                    l: true,
                    userId: true,
                    symbol: true,
                    creationDate: true,
                },
                orderBy: {
                    creationDate: "asc"
                }
            }
        }
    });

    if (!match) throw HttpError.NotFound("Partida não encontrada");
    if (match.user1Id != req.decoded?.id && match.user2Id != req.decoded?.id) throw HttpError.NotFound("Partida não encontrada");
    return HttpResponse.Ok(match);
}