import WsService, { OngoingGame } from "../Services/WsService";
import prisma from "../db";
import updateRatings from "./updateRatings";

export default async function endGame(winnerId: number | null, user1Id: number, user2Id: number, game: OngoingGame){
    if(game.counter) clearInterval(game.counter);
    const [newP1R, newP2R, oldP1R, oldP2R] = await updateRatings(winnerId, user1Id, user2Id);
    await prisma.match.update({
        where: {
            id: game.dbMatchId
        },
        data: {
            creationDate: game.startedAt,
            user1Id,
            user2Id,
            winnerId: winnerId,
            user1Rating: oldP1R,
            user2Rating: oldP2R,
            endDate: new Date()
        }
    })

    WsService.ongoingGames.delete(`${game.player1}-${game.player2}`)

    const player1Socket = Array.from(WsService.io.sockets.sockets.values()).find(s => s.data.user.id === game.player1);
    if(player1Socket){
        player1Socket.emit('game-ended', {
            winner: winnerId === game.player1,
            rating: newP1R,
            diff: newP1R - oldP1R,
            tie: !winnerId
        })
        player1Socket.leave(`${game.player1}-${game.player2}`)
    }
    const opponentSocket = Array.from(WsService.io.sockets.sockets.values()).find(s => s.data.user.id === game.player2);

    if (opponentSocket) {
        opponentSocket.emit('game-ended', {
            winner: winnerId === game.player2,
            rating: newP2R,
            diff: newP2R - oldP2R,
            tie: !winnerId
        })
        opponentSocket.leave(`${game.player1}-${game.player2}`)
    }
}