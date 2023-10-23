import { Server as SocketServer } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ENV } from '../server';
import prisma from '../db';
import logger from '../Helpers/logger';
import checkTTTWinner from '../Helpers/checkTTTWinner';
import updateRatings from '../Helpers/updateRatings';

const INITIAL_MAX_DIFFERENCE = 32;
const MATCHMAKING_INTERVAL = 700;

const MAX_TIME_MS = 1000 * 60 * 5;
// const MAX_TIME_MS = 1000 * 10;

class Ws {
    public io: SocketServer
    public initialized: boolean = false;
    public searchingGames = new Map<number, { rating: number, begunSearchTimestamp: number, maxRatingDifference: number, socketId: string }>();
    public ongoingGames = new Map<string, {
        player1: number,
        player2: number,
        player1Symbol: "X" | "O",
        whoseTurn: 1 | 2,
        board: {
            state: ("O" | "X" | "T" | null),
            board: ("O" | "X" | null)[][]
        }[][],
        playingBlock: [number, number] | null,
        player1Time: number,
        player2Time: number,
        counter: NodeJS.Timeout | null,
        startedAt: Date,
        dbMatchId: number
    }>();

    public init(server: SocketServer) {
        if (this.initialized) return;
        this.io = server;

        this.initialized = true;
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));
            let user: JwtPayload;
            try {
                user = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
            } catch (error) {
                return next(new Error('Authentication error'));
            }
            if (!user.id) return next(new Error('Authentication error'));
            socket.data.user = user;
            if (Array.from(this.io.sockets.sockets.values()).find(s => s.data.user.id === user.id)) return next(new Error('User already connected'));
            next();
        });

        this.io.on('connection', (socket) => {
            const user = socket.data.user;

            console.log(user.id, 'connected');
            const playingGamesUpdater = setInterval(() => {
                const isPlaying = Array.from(this.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id);
                socket.emit('is-ingame', isPlaying);
            }, 1000);
            socket.on('find-game', async () => {
                if (this.searchingGames.has(user.id)) return;
                if (Array.from(this.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)) return;
                const player = await prisma.user.findUnique({ where: { id: user.id } })
                if (!player) return;
                console.log(user.id, ' searching for game')

                this.searchingGames.set(user.id, {
                    rating: player.rating,
                    begunSearchTimestamp: Date.now(),
                    maxRatingDifference: INITIAL_MAX_DIFFERENCE,
                    socketId: socket.id
                })
                console.log(this.searchingGames)
            });

            socket.on('ready-to-play', () => {
                const game = Array.from(this.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)
                if (!game) return;
                console.log(user.id, ' ready to play')
                socket.emit('game-update', {
                    board: game.board,
                    myTurn: game.whoseTurn === 1 ? game.player1 === user.id : game.player2 === user.id,
                    playingBlock: game.playingBlock
                })
            })

            socket.on('game-click', async ([i, j, k, l]) => {
                const game = Array.from(this.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id)
                if (!game) return;
                if (game.whoseTurn === 1 && game.player1 !== user.id) return;
                if (game.whoseTurn === 2 && game.player2 !== user.id) return;
                if (typeof i !== 'number' || typeof j !== 'number' || typeof k !== 'number' || typeof l !== 'number') return;
                if (game.board[i][j].board[k][l]) return;
                if (game.board[i][j].state) return;






                const opponent = game.player1 === user.id ? game.player2 : game.player1;
                const opponentSocket = Array.from(this.io.sockets.sockets.values()).find(s => s.data.user.id === opponent);
                if (!opponentSocket) return;


                game.whoseTurn = game.whoseTurn === 1 ? 2 : 1;
                
                game.board[i][j].board[k][l] = game.player1 === user.id ? game.player1Symbol :
                game.player1Symbol === "X" ? "O" : "X";


                await prisma.move.create({
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


                const didWinSub = checkTTTWinner(game.board[i][j].board, game.board[i][j].board[k][l]!);
                if (didWinSub) {
                    game.board[i][j].state = game.board[i][j].board[k][l];
                }

                const didWin = checkTTTWinner(game.board.map((l1) => l1.map(l2 => l2.state == "T" ? null : l2.state)), game.board[i][j].board[k][l]!);
                
                if(didWin){
                    const [newRa, newRb, oldRa, oldRb] = await updateRatings(false, user.id, opponent);
                    await prisma.match.update({
                        where: {
                            id: game.dbMatchId
                        },
                        data: {
                            creationDate: game.startedAt,
                            user1Id: user.id,
                            user2Id: opponent,
                            winnerId: user.id,
                            user1Rating: oldRa,
                            user2Rating: oldRb,
                            endDate: new Date()
                        }
                    })
                    this.ongoingGames.delete(`${game.player1}-${game.player2}`)
                    socket.emit('game-ended', {
                        winner: true,
                        rating: newRa,
                        diff: newRa - oldRa
                    })
                    opponentSocket.emit('game-ended', {
                        winner: false,
                        rating: newRb,
                        diff: newRb - oldRb
                    })
                    return;
                }

                //Check if block is full
                if (game.board[i][j].board.every((row) => row.every((cell) => cell != null))) {
                    game.board[i][j].state = "T";
                }



                if (game.board[k][l].board.every((row) => row.every((cell) => cell != null)) || !!game.board[k][l].state) {
                    if (game.board[i][j].board.every((row) => row.every((cell) => cell != null)) || !!game.board[i][j].state) {
                        if (game.board.every((row) => row.every((cell) => cell.board.every((row) => row.every((cell) => cell != null))))) {
                            const [newRa, newRb, oldRa, oldRb] = await updateRatings(true, user.id, opponent);
                            await prisma.match.update({
                                where: {
                                    id: game.dbMatchId
                                },
                                data: {
                                    creationDate: game.startedAt,
                                    user1Id: user.id,
                                    user2Id: opponent,
                                    winnerId: null,
                                    user1Rating: oldRa,
                                    user2Rating: oldRb,
                                    endDate: new Date()
                                }
                            })
                            //GAME ENDED - Tie

                            this.ongoingGames.delete(`${game.player1}-${game.player2}`)
                            socket.emit('game-ended', {
                                winner: false,
                                rating: newRa,
                                diff: newRa - oldRa,
                                tie: true
                            })
                            opponentSocket.emit('game-ended', {
                                winner: false,
                                rating: newRb,
                                diff: newRb - oldRb,
                                tie: true
                            })
                            return;
                        } else {
                            game.playingBlock = null
                        }
                    } else {
                        game.playingBlock = null
                    }
                } else {
                    game.playingBlock = [k, l]
                }


                this.ongoingGames.set(`${game.player1}-${game.player2}`, game);
                console.log(user.id, ' clicked on ', [i, j, k, l])
                socket.emit('game-update', {
                    board: game.board,
                    myTurn: game.whoseTurn === 1 ? game.player1 === user.id : game.player2 === user.id,
                    playingBlock: game.playingBlock
                })
                //Send update to opponent
                opponentSocket.emit('game-update', {
                    board: game.board,
                    myTurn: game.whoseTurn === 1 ? game.player1 === opponent : game.player2 === opponent,
                    playingBlock: game.playingBlock
                })

            })

            socket.on('cancel-search', () => {
                console.log(this.searchingGames)
                console.log(user.id, ' canceled search')
                this.searchingGames.delete(user.id);
            });

            socket.on('disconnect', () => {
                this.searchingGames.delete(user.id);
                clearInterval(playingGamesUpdater);
                console.log('user ' + user.id + ' disconnected');
            });
        });

        setInterval(() => {
            this.searchingGames.forEach(async (player, id) => {
                //Try to find a match
                const player2 = Array.from(this.searchingGames.entries()).find(([pId, p]) => {
                    if (id === pId) return false;
                    const ratingDifference = Math.abs(p.rating - player.rating)
                    return ratingDifference < p.maxRatingDifference && ratingDifference < player.maxRatingDifference
                })

                if (player2) {
                    if (this.ongoingGames.has(`${id}-${player2[0]}`)) return logger.warn('Match already exists!!');
                    this.searchingGames.delete(id)
                    this.searchingGames.delete(player2[0])
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

                    this.ongoingGames.set(`${id}-${player2[0]}`, {
                        player1: id,
                        player2: player2[0],
                        player1Symbol,
                        whoseTurn: player1Symbol === "X" ? 1 : 2,
                        board: Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({
                            state: null,
                            board: Array(3).fill(null).map(() => Array(3).fill(null))
                        }))),
                        playingBlock: null,
                        player1Time: MAX_TIME_MS,
                        player2Time: MAX_TIME_MS,
                        counter: null,
                        startedAt: new Date(),
                        dbMatchId: match.id
                    })
                    this.io.to(player.socketId).to(player2[1].socketId).emit('match-found', { matchId: `${id}-${player2[0]}` })
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                    const counter: NodeJS.Timeout = setInterval(async () => {
                        const game = this.ongoingGames.get(`${id}-${player2[0]}`)
                        if (!game) return clearInterval(counter);
                        if (game.whoseTurn === 1) {
                            game.player1Time = Number((game.player1Time - 100).toFixed(2));
                        } else {
                            game.player2Time = Number((game.player2Time - 100).toFixed(2));
                        }
                        if(game.player1Time <= 0){
                            clearInterval(counter);

                            const [newRa, newRb, oldRa, oldRb] = await updateRatings(false, game.player2, game.player1);
                            await prisma.match.update({
                                where: {
                                    id: game.dbMatchId
                                },
                                data: {
                                    creationDate: game.startedAt,
                                    user1Id: game.player1,
                                    user2Id: game.player2,
                                    winnerId: game.player2,
                                    user1Rating: oldRb,
                                    user2Rating: newRa,
                                    endDate: new Date()
                                }
                            })

                            this.ongoingGames.delete(`${game.player1}-${game.player2}`)
                            const player1Socket = Array.from(this.io.sockets.sockets.values()).find(s => s.data.user.id === game.player1);
                            const player2Socket = Array.from(this.io.sockets.sockets.values()).find(s => s.data.user.id === game.player2);
                            if(!player1Socket || !player2Socket) return;

                            player1Socket.emit('game-ended', {
                                winner: false,
                                rating: newRb,
                                diff: newRb - oldRb
                            })
                            player2Socket.emit('game-ended', {
                                winner: true,
                                rating: newRa,
                                diff: newRa - oldRa
                            })
                            return;
                        }else if(game.player2Time <= 0){
                            clearInterval(counter);

                            const [newRa, newRb, oldRa, oldRb] = await updateRatings(false, game.player1, game.player2);
                            await prisma.match.update({
                                where: {
                                    id: game.dbMatchId
                                },
                                data: {
                                    creationDate: game.startedAt,
                                    user1Id: game.player1,
                                    user2Id: game.player2,
                                    winnerId: game.player1,
                                    user1Rating: oldRa,
                                    user2Rating: oldRb,
                                    endDate: new Date()
                                }
                            })

                            this.ongoingGames.delete(`${game.player1}-${game.player2}`)
                            const player1Socket = Array.from(this.io.sockets.sockets.values()).find(s => s.data.user.id === game.player1);
                            const player2Socket = Array.from(this.io.sockets.sockets.values()).find(s => s.data.user.id === game.player2);
                            if(!player1Socket || !player2Socket) return;

                            player1Socket.emit('game-ended', {
                                winner: true,
                                rating: newRa,
                                diff: newRa - oldRa
                            })
                            player2Socket.emit('game-ended', {
                                winner: false,
                                rating: newRb,
                                diff: newRb - oldRb
                            })
                            return;
                        }
                        this.ongoingGames.set(`${id}-${player2[0]}`, game)
                        this.io.to(player.socketId).to(player2[1].socketId).emit('time-update', {
                            player1: {
                                id: game.player1,
                                time: game.player1Time
                            },
                            player2: {
                                id: game.player2,
                                time: game.player2Time
                            }
                        })
                    }, 100)



                } else {
                    this.searchingGames.set(id, {
                        ...player,
                        maxRatingDifference: player.maxRatingDifference + Math.abs(Math.trunc((Date.now() - player.begunSearchTimestamp) / 10000) > 5 ? 0 : Math.trunc((Date.now() - player.begunSearchTimestamp) / 10000) * INITIAL_MAX_DIFFERENCE),
                        begunSearchTimestamp: player.begunSearchTimestamp
                    })
                }
            })
            this.io.emit('players-searching', this.searchingGames.size)
        }, MATCHMAKING_INTERVAL)
    }

}

export default new Ws()
