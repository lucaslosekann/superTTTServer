import _ from './index';
import dotenv from 'dotenv';
dotenv.config()
import EnvSchema from './Schemas/EnvSchema';
export const ENV = EnvSchema.parse(process.env);

import http from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
const app = express();
const server = http.createServer(app);

import WsService from './Services/WsService';
WsService.init(new SocketServer(server, {
    cors: {
        origin: '*',
    }
}));




import cors from 'cors';
app.use(cors());

import logger from './Helpers/logger';
import { ErrorMiddleware } from './Helpers/RequestHandler';

import UsersRouter from './Routers/UsersRouter';
import MatchesRouter from './Routers/MatchesRouter';
import RankingRouter from './Routers/RankingRouter';
import FriendsRouter from './Routers/FriendsRouter';

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/healthz", (_, res) => res.status(200).end());

const apiV1Router = express.Router();
app.use('/v1', apiV1Router);



//Routers
apiV1Router.use("/users", UsersRouter)
apiV1Router.use("/matches", MatchesRouter)
apiV1Router.use("/ranking", RankingRouter)
apiV1Router.use("/friends", FriendsRouter)

app.use(ErrorMiddleware);
server.listen(ENV.PORT, () => logger.info("Api it's running " + ENV.PORT));
