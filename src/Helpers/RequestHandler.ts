import { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"
import HttpError from "./HttpError"
import logger from "./logger"
import HttpResponse from "./HttpResponse"
import { randomUUID } from "node:crypto"
export default function RequestHandler(controller: (req: Request, res: Response, next: NextFunction) => Promise<any>){

    return async (req: Request, res: Response, next: NextFunction) => {
        const completeRoute = req.method + " " + req.baseUrl + req.route.path;
        try {
            const response = await controller(req, res, next);
            if(response instanceof HttpResponse){
                return res.status(response.statusCode).json(response.payload);
            }
            logger.warn(`Controller on route ${completeRoute} did not return a HttpResponse object`);
            return res.status(200).end()
        } catch (error: any) {
            error.completeRoute = completeRoute;
            next(error)
        }
    }
}

export function ErrorMiddleware(error: Error & {
    completeRoute?: string
}, req: Request, res: Response, next: NextFunction){

    if(error instanceof ZodError){
        return res.status(400).json({ error: error.errors })
    }
    if(error instanceof HttpError){
        return res.status(error.statusCode).json({ message: error.message })
    }
    
    const errorIdentifier = randomUUID()
    logger.error(`Identifier: ${errorIdentifier} ; Error on route ${error.completeRoute}, ${error.message}, ${error.stack}, ${error.name}`)
    return res.status(500).json({ message: `Internal server error, please contact the administrator with the identifier ${errorIdentifier}`})
}

