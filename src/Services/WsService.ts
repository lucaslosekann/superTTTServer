import { Server as SocketServer } from 'socket.io';
import { WsAuth } from '../Middlewares/Auth';
import menuInfoUpdater from '../Game/menuInfoUpdater';
import findGame from '../Game/Events/find-game';
import readyToPlay from '../Game/Events/ready-to-play';
import matchMaking from '../Game/MatchMaking';
import gameClick from '../Game/Events/game-click';


type PlayerSearching = { rating: number, begunSearchTimestamp: number, maxRatingDifference: number, socketId: string }

export type OngoingGame = {
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
    counter: number | null,
    startedAt: Date,
    dbMatchId: number
}


class Ws {
    public io: SocketServer
    public initialized: boolean = false;
    public searchingGames = new Map<number, PlayerSearching>();
    public ongoingGames = new Map<string, OngoingGame>();
    public isUpdating = false;

    public init(server: SocketServer) {
        if (this.initialized) return;
        this.io = server;

        this.initialized = true;
        this.io.use(WsAuth);

        this.io.on('connection', (socket) => {
            const user = socket.data.user;
            const menuInfoUpdaterInterval = menuInfoUpdater(socket, user, 1000);


            socket.on('find-game', findGame(socket, user));

            socket.on('ready-to-play', readyToPlay(socket, user));

            socket.on('game-click', gameClick(user));

            socket.on('cancel-search', () => {
                this.searchingGames.delete(user.id);
            });

            socket.on('disconnect', () => {
                this.searchingGames.delete(user.id);
                clearInterval(menuInfoUpdaterInterval);
            });
        });
        
        const matchmakingInterval = matchMaking()
    }

}

export default new Ws()