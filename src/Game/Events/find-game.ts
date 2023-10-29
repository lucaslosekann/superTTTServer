import { JwtPayload } from "jsonwebtoken";
import prisma from "../../db";
import WsService from "../../Services/WsService";
import { Socket } from "socket.io";
import { INITIAL_MAX_DIFFERENCE } from "../../config";

export default function findGame (socket: Socket, user: JwtPayload) {
    return async () => {
        if (WsService.isUpdating) return;
        if (WsService.searchingGames.has(user.id)) return;
        if (Array.from(WsService.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)) return;
        const player = await prisma.user.findUnique({ where: { id: user.id } })
        if (!player) return;
    
        WsService.searchingGames.set(user.id, {
            rating: player.rating,
            begunSearchTimestamp: Date.now(),
            maxRatingDifference: INITIAL_MAX_DIFFERENCE,
            socketId: socket.id
        })
    }
}