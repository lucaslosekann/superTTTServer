import { Router } from "express";
import RequestHandler from "../Helpers/RequestHandler";

import * as RankingController from "../Controllers/RankingController";
import { verifyToken } from "../Middlewares/Auth";

const Ranking = Router();

Ranking.get("/", RequestHandler(RankingController.index));

export default Ranking;