import { NextFunction, Request, Response } from "express";
import HttpError from "../Helpers/HttpError";
import HttpResponse from "../Helpers/HttpResponse";
import WsService from "../Services/WsService";


export async function toggleUpdating(req: Request, res: Response, next: NextFunction) {
    WsService.isUpdating = !WsService.isUpdating;
    WsService.searchingGames.clear();
    return HttpResponse.Ok({ isUpdating: WsService.isUpdating });
}