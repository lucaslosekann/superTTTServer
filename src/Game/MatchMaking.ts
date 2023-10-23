import endGame from "../Helpers/endGame";
import logger from "../Helpers/logger";
import WsService from "../Services/WsService";
import { INITIAL_MAX_DIFFERENCE, MATCHMAKING_INTERVAL, MAX_TIME_MS } from "../config";
import prisma from "../db";

export default function matchMaking() {
    return setInterval(() => {
        WsService.searchingGames.forEach(async (player, id) => {
            const player2 = Array.from(WsService.searchingGames.entries()).find(([pId, p]) => {
                if (id === pId) return false;
                const ratingDifference = Math.abs(p.rating - player.rating)
                return ratingDifference < p.maxRatingDifference && ratingDifference < player.maxRatingDifference
            })

            if (!player2) {
                WsService.searchingGames.set(id, {
                    ...player,
                    maxRatingDifference: player.maxRatingDifference + Math.abs(Math.trunc((Date.now() - player.begunSearchTimestamp) / 10000) > 5 ? 0 : Math.trunc((Date.now() - player.begunSearchTimestamp) / 10000) * INITIAL_MAX_DIFFERENCE),
                })
                return;
            }

            if (WsService.ongoingGames.has(`${id}-${player2[0]}`)) return logger.warn('Match already exists!!');

            WsService.searchingGames.delete(id)
            WsService.searchingGames.delete(player2[0])
            
            const player1Symbol = Math.random() > 0.5 ? "X" : "O";

            const match = await prisma.match.create({
                data: {
                    creationDate: new Date(),
                    user1Id: id,
                    user2Id: player2[0],
                    winnerId: null,
                    user1Rating: player.rating,
                    user2Rating: player2[1].rating,
                    endDate: null,
                    user1Symbol: player1Symbol
                }
            })

            WsService.ongoingGames.set(`${id}-${player2[0]}`, {
                player1: id,
                player2: player2[0],
                player1Symbol,
                whoseTurn: player1Symbol === "X" ? 1 : 2,
                board: createBoard(),
                playingBlock: null,
                player1Time: MAX_TIME_MS,
                player2Time: MAX_TIME_MS,
                counter: null,
                startedAt: new Date(),
                dbMatchId: match.id
            })

            WsService.io.to(player.socketId).to(player2[1].socketId).emit('match-found', { matchId: `${id}-${player2[0]}` })


            await new Promise((resolve) => setTimeout(resolve, 1000))

            matchTimer(id, player2[0]);

        })


        WsService.io.emit('players-searching', WsService.searchingGames.size)
    }, MATCHMAKING_INTERVAL)
}



function createBoard(){
    return Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({
        state: null,
        board: Array(3).fill(null).map(() => Array(3).fill(null))
    })))
}


function matchTimer(player1Id: number, player2Id: number){
    const counter: NodeJS.Timeout = setInterval(async () => {
        const game = WsService.ongoingGames.get(`${player1Id}-${player2Id}`)
        if (!game) return clearInterval(counter);

        if (game.whoseTurn === 1) {
            game.player1Time = Number((game.player1Time - 100).toFixed(2));
        } else {
            game.player2Time = Number((game.player2Time - 100).toFixed(2));
        }


        if(game.player1Time > 0 && game.player2Time > 0){
            WsService.ongoingGames.set(`${player1Id}-${player2Id}`, game)
            WsService.io.to(`${player1Id}-${player2Id}`).emit('time-update', {
                player1: {
                    id: game.player1,
                    time: game.player1Time
                },
                player2: {
                    id: game.player2,
                    time: game.player2Time
                }
            })
            return;
        }else{
            await endGame(game.player1Time > 0 ? game.player1: game.player2, game.player1, game.player2, game);
            return;
        }

    }, 100)


    WsService.ongoingGames.set(`${player1Id}-${player2Id}`, {
        ...WsService.ongoingGames.get(`${player1Id}-${player2Id}`)!,
        counter: Number(counter)
    })
}