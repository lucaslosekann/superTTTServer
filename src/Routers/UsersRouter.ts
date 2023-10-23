import logger from '../Helpers/logger';
import { Router } from "express";
import RequestHandler from "../Helpers/RequestHandler";

import * as UsersController from "../Controllers/UsersController";
import { verifyToken } from '../Middlewares/Auth';
const users = Router();

// /v1/users



users.post("/login", RequestHandler(UsersController.login));
users.post("/signup", RequestHandler(UsersController.register));
users.get("/rating", verifyToken, RequestHandler(UsersController.getRating));

export default users;