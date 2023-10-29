import { ENV } from '../server';
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import HttpError from '../Helpers/HttpError';
import { Socket } from 'socket.io';
import WsService from '../Services/WsService';
import { ExtendedError } from 'socket.io/dist/namespace';


export function verifyToken(req: Request, _: Response, next: NextFunction) {
    try {
        const JWT = req.headers.authorization;

        if (!JWT) throw HttpError.Unauthorized("Header 'Authorization' is missing");
        if (typeof JWT != 'string') throw HttpError.Unauthorized("Header 'Authorization' is not a string");
        const [bearer, token] = JWT.split(' ');

        try {
            const decoded: typeof req.decoded = jwt.verify(token, ENV.JWT_SECRET) as typeof req.decoded;
            req.decoded = decoded;
            return next();
        } catch (err) {
            throw HttpError.Unauthorized('Invalid JWT Token');
        }
    } catch (e) {
        next(e);
    }
}


export const WsAuth = (socket: Socket, next: (err?: ExtendedError | undefined)=>void) => {
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
    if (Array.from(WsService.io.sockets.sockets.values()).find(s => s.data.user.id === user.id)) return next(new Error('User already connected'));
    next();
}


export const verifyApiKey = (req: Request, _: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) throw HttpError.Unauthorized("Header 'x-api-key' is missing");
        if (typeof apiKey != 'string') throw HttpError.Unauthorized("Header 'x-api-key' is not a string");
        if (apiKey !== ENV.API_KEY) throw HttpError.Unauthorized("Invalid API Key");
        next();
    } catch (e) {
        next(e);
    }
}