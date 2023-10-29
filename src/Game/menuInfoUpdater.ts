import { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";
import WsService from "../Services/WsService";

export default function menuInfoUpdater(socket: Socket, user: JwtPayload, refreshRate: number = 1000){
    return setInterval(() => {
        const isPlaying = Array.from(WsService.ongoingGames.values()).find(ps => ps.player1 === user.id || ps.player2 === user.id);
        const isSearching = Array.from(WsService.searchingGames.keys()).find(id => id === user.id);
        socket.emit('is-searching', !!isSearching);
        socket.emit('is-ingame', !!isPlaying);
        socket.emit('is-updating', WsService.isUpdating);
        socket.emit('in-game-players', WsService.ongoingGames.size * 2);
    }, refreshRate);
}