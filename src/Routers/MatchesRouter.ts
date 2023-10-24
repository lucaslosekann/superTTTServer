import { Router } from "express";
import RequestHandler from "../Helpers/RequestHandler";

import * as MatchesController from "../Controllers/MatchesController";
import { verifyToken } from "../Middlewares/Auth";

const Matches = Router();

Matches.get("/last", verifyToken, RequestHandler(MatchesController.getLastMatches));
Matches.get("/:id",  verifyToken, RequestHandler(MatchesController.get));

export default Matches;