import { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";
import WsService from "../../Services/WsService";

export default function readyToPlay(socket: Socket, user: JwtPayload){
    return () => {
        const game = Array.from(WsService.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)
        if (!game) return;
        console.log(user.id, ' ready to play')

        socket.join(`${game.player1}-${game.player2}`)

        WsService.io.to(`${game.player1}-${game.player2}`).emit('game-update', {
            board: game.board,
            whoseTurnId: game.whoseTurn === 1 ? game.player1 : game.player2,
            playingBlock: game.playingBlock
        })
    }
}