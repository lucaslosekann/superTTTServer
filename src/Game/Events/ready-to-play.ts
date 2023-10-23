import { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";
import WsService from "../../Services/WsService";
import prisma from "../../db";

export default function readyToPlay(socket: Socket, user: JwtPayload){
    return async () => {
        const game = Array.from(WsService.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)
        if (!game) return;
        console.log(user.id, ' ready to play')

        socket.join(`${game.player1}-${game.player2}`)

        const opponent = await prisma.user.findUnique({
            where: {
                id: game.player1 === user.id ? game.player2 : game.player1
            },
            select: {
                name: true
            }
        })

        socket.emit('game-info', {
            opponentName: opponent?.name
        })


        WsService.io.to(`${game.player1}-${game.player2}`).emit('game-update', {
            board: game.board,
            whoseTurnId: game.whoseTurn === 1 ? game.player1 : game.player2,
            playingBlock: game.playingBlock
        })
    }
}