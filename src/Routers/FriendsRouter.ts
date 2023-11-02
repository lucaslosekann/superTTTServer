import { Router } from "express";
import RequestHandler from "../Helpers/RequestHandler";

import * as FriendsController from "../Controllers/FriendsController";
import { verifyToken } from "../Middlewares/Auth";

const Friends = Router();

Friends.post("/request", verifyToken, RequestHandler(FriendsController.sendRequest));
Friends.delete("/:userId", verifyToken, RequestHandler(FriendsController.remove));
Friends.post("/request/match", verifyToken, RequestHandler(FriendsController.sendRequestByMatchId));
Friends.post("/accept/:userId", verifyToken, RequestHandler(FriendsController.acceptRequest));

Friends.get("/", verifyToken, RequestHandler(FriendsController.index));


export default Friends;