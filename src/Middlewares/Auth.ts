import { ENV } from '../server';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import HttpError from '../Helpers/HttpError';


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