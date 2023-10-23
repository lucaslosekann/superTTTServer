import { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";
import WsService from "../Services/WsService";

export default function playingGamesUpdater(socket: Socket, user: JwtPayload, refreshRate: number = 1000){
    return setInterval(() => {
        const isPlaying = Array.from(WsService.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id);
        socket.emit('is-ingame', isPlaying);
    }, refreshRate);
}