import { IServiceID } from "../types/service";
import * as Express from "express";
import { getConfig, globalConfigEndpoint } from "./config";
import { logSuccess } from "./log";
import { HTTPResponse, HTTPStatus } from "./http";
import { logoutEndpoint, serviceAuth } from "./auth";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import { connectDB } from "./postgres";

export function setupServer(service: IServiceID): { apiRoute: Express.Router, adminRoute: Express.Router } {
    const CONFIG = getConfig(service);

    const app = Express();

    /*  Set up default middlewares */
    app.use(bodyParser.json());
    app.use(cookieParser());
    
    /* Set up API */
    const apiRoute = Express.Router();
    apiRoute.get("/global-config", globalConfigEndpoint);

    /* The Admin route is supposed to contain dangerous endpoints, that should only be callable by admins.
       Access to /api/admin/* may be restricted by firewalling or disabled completely */
    const adminRoute = Express.Router();
    adminRoute.use(serviceAuth("admin"));
    adminRoute.get("/verify-token", (_, res) => res.send(HTTPResponse.OK));
    apiRoute.use("/admin", adminRoute);

    app.use("/api", apiRoute);

    app.use("/api", (req, res) => {
        res.status(HTTPStatus.NotFound);
        return res.send(HTTPResponse.apiNotFound);
    });

    app.get("/logout", logoutEndpoint);

    app.use(Express.static(`${__dirname}/../frontend/`));

    app.listen(CONFIG.port, 
        () => logSuccess(`SERVICE ${service} successfully started on ${CONFIG.url}`));

    connectDB(CONFIG);

    return { apiRoute, adminRoute };
}