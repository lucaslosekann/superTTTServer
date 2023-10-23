import { JwtPayload } from "jsonwebtoken";
import WsService, { OngoingGame } from "../../Services/WsService";
import prisma from "../../db";
import checkTTTWinner from "../../Helpers/checkTTTWinner";
import endGame from "../../Helpers/endGame";

export default function gameClick(user: JwtPayload) {
    return async ([i, j, k, l]: [
        i: number,
        j: number,
        k: number,
        l: number
    ]) => {
        const game = Array.from(WsService.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)
        if (!game) return;
        if (game.whoseTurn === 1 && game.player1 !== user.id) return;
        if (game.whoseTurn === 2 && game.player2 !== user.id) return;
        if (typeof i !== 'number' || typeof j !== 'number' || typeof k !== 'number' || typeof l !== 'number') return;
        if (game.board[i][j].board[k][l]) return;
        if (game.board[i][j].state) return;

        const opponent = game.player1 === user.id ? game.player2 : game.player1;

        game.whoseTurn = game.whoseTurn === 1 ? 2 : 1;
        game.board[i][j].board[k][l] = game.player1 === user.id ? game.player1Symbol :
            game.player1Symbol === "X" ? "O" : "X";


        await createMove(game, user, [i, j, k, l]);


        const didWinSub = checkTTTWinner(game.board[i][j].board, game.board[i][j].board[k][l]!);
        if (didWinSub) {
            game.board[i][j].state = game.board[i][j].board[k][l];
        }

        const didWin = checkTTTWinner(game.board.map((l1) => l1.map(l2 => l2.state == "T" ? null : l2.state)), game.board[i][j].board[k][l]!);
        if (didWin) {
            await endGame(user.id, game.player1, game.player2, game);
            return;
        }

        //Check if block is full
        if (game.board[i][j].board.every((row) => row.every((cell) => cell != null)) && !didWinSub) {
            game.board[i][j].state = "T";
        }

        //Check if game is full

        if (game.board.every((row) => row.every((cell) => cell.state != null))) {
            await endGame(null, game.player1, game.player2, game);
            return;
        }


        //Check playing block
        if (!game.board[k][l].state && game.board[k][l].board.some((row) => row.some((cell) => cell == null))) {
            game.playingBlock = [k, l]
        } else {
            game.playingBlock = null;
        }


        WsService.ongoingGames.set(`${game.player1}-${game.player2}`, game);
        WsService.io.to(`${game.player1}-${game.player2}`).emit('game-update', {
            board: game.board,
            whoseTurnId: game.whoseTurn === 1 ? game.player1 : game.player2,
            playingBlock: game.playingBlock
        })
    }
}



function createMove(game: OngoingGame, user: JwtPayload, [i, j, k, l]: [
    i: number,
    j: number,
    k: number,
    l: number
]) {
    return prisma.move.create({
        data: {
            i,
            j,
            k,
            l,
            symbol: game.board[i][j].board[k][l]!,
            userId: user.id,
            matchId: game.dbMatchId
        }
    })
}