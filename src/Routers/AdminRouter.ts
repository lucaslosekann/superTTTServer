import { Router } from "express";
import RequestHandler from "../Helpers/RequestHandler";

import * as AdminController from "../Controllers/AdminController";
import { verifyApiKey } from "../Middlewares/Auth";

const Admin = Router();


Admin.post("/toggle-updating", verifyApiKey, RequestHandler(AdminController.toggleUpdating));

export default Admin;