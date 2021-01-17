import { IServiceID } from "./../types/service";
import { IPermission, IUser } from "./../types/user";
import { assert } from "./assert";
import { getConfig } from "./config";
import { HTTPResponse, HTTPStatus } from "./http";
import { logDebug, logWarning } from "./log";
import { task } from "./task";
import * as Express from "express";
import { ENGINE_METHOD_PKEY_ASN1_METHS } from "constants";

const AUTH_CONFIG = getConfig("login");


type IStringMap = { [name: string]: string };

const usersByToken = new Map<string, { user: IUser, lastSeen: number }>();
const SESSION_DURATION = 60 * 60 * 1000 /* 1h */;

task({
    name: "User Session Cleanup",
    task() {
        const minTime = Date.now() - SESSION_DURATION;
        for(const [token, info] of usersByToken.entries()) {
            if(info.lastSeen >= minTime) continue;

            logDebug(`Cleaned up user session of User(${info.user.uid})`);
            usersByToken.delete(token);
        }
    },
    interval: 100_000
});

export async function getUser(token: string, service: IServiceID): Promise<IUser | never> {
    const CONFIG = getConfig(service);

    try {
        const response = await fetch(`${AUTH_CONFIG.url}/api/verify-token`, {
            method: "POST",
            body: JSON.stringify({ token }),
            headers: {
                'Service': service,
                'ServiceToken': CONFIG.secret_token
            }
        });

        if(!response.ok)
            throw new Error(`User passed invalid token`);

        const { user } = await response.json();

        return user;
    } catch(error) {
        throw new Error(`Connection Error while performing login handshake (${error.message})`);
    }
}

export function userAuth(service: IServiceID) {
    return async function userAuthMiddleware(req: Express.Request, res: Express.Response, next: () => void) {
        /* If the client is already identified as a service, skip user authentication */
        if(res.locals.service)
            return next(); 
        /* If user is coming from login service, validate token against login service */
        if(req.query["token"]) {
            const token = req.query["token"];

            if(typeof token !== "string") {
                return res
                   .status(HTTPStatus.BadRequest)
                   .end(`Token has invalid format`);
            }

            try {
                const user = await getUser(token, service);
                res.cookie("token", token);
                res.locals = { user };
                return next();
            } catch(error) {
                logWarning(`Failed to verify user handshake token with login service. Aborted login.`, { error, token });
                return res.redirect(`${AUTH_CONFIG.url}/error?type=handshake`);
            }
        }

        /* If user is already logged in, and token is still valid, login and proceed */
        if(req.cookies["token"] && usersByToken.has(req.cookies["token"])) {
            const info = usersByToken.get(req.cookies["token"]);
            info.lastSeen = Date.now();
            res.locals = { user: info.user };
            logDebug(`User(${info.user.uid}) session validated`);
            return next();
        }

        /* For APIs, we do not want to redirect but reject instead */
        if(req.path.startsWith("/api")) {
            res.status(HTTPStatus.Unauthorized);
            return res.end(HTTPResponse.notAuthorized);
        }

        /* Unable to log in to user page, lets start the login process */
        return res.redirect(`${AUTH_CONFIG.url}/?service=${service}`);
    }
}

export function hasPermission(service: IPermission["service"], type: IPermission["type"], value?: IPermission["value"], _permissions: IPermission[] = []) {
    return Object.assign(_hasPermission([..._permissions, { service, type, value}]), {
        or(service2: IPermission["service"], type2: IPermission["type"], value2?: IPermission["value"]) {
          return hasPermission(service2, type2, value2, [..._permissions, { service, type, value }]);
        }
    })
}

function _hasPermission(requiredPermissions: IPermission[]) {
    return function permissionMiddleware(_: any, res: Express.Response, next: (authenticated: boolean) => void) {
        // Permissions do not apply to services. Either they can or they cannot perform a certain action
        if(res.locals.service)
          return next(true);

        assert("hasPermission occurs after userAuth", !!res.locals.user);

        const { permissions } = res.locals.user;

        if(permissions.some(it => it.service === 'login' && it.type === 'GLOBAL_ADMIN')) {
            logDebug(`User has global admin permissions`);
            return next(true);
        }

        if(permissions.some(it => requiredPermissions.some(required => it.service === required.service && it.type === required.type && (!required.value || it.value === required.value)))) {
            logDebug(`User has required permissions`);
            return next(true);
        }

        return res
          .status(HTTPStatus.Forbidden)
          .end(HTTPResponse.notEnoughPermissions);
    };
}

interface IAuthHandler {
    (req: Express.Request, res: Express.Response, next: () => void);
    orUserAuth(service: IServiceID): 
      (req: Express.Request, res: Express.Response, next: () => void) => void;
}

export function serviceAuth(...services: IServiceID[]): IAuthHandler {
    return Object.assign(_serviceAuth(false, services), {
      orUserAuth(userService: IServiceID) {
        const serviceHandler = _serviceAuth(/*bypass*/ true, services);
        const userHandler = userAuth(userService);

        return (req: Express.Request, res: Express.Response, next: () => void) => 
          serviceHandler(req, res, () => userHandler(req, res, () => {
              assert("Client is authenticated as either user or service", res.locals.user || res.locals.service);
              next();
          }));
      },
    });
}
function _serviceAuth(bypass: boolean, services: IServiceID[]) {
    return function serviceAuthMiddleware(req: Express.Request, res: Express.Response, next: () => void) {
        if(bypass && !req.get("Service"))
            return next();

        const service = req.get("Service");

        const config = getConfig(service as IServiceID);

        if(!config) {
            res.status(HTTPStatus.Unauthorized);
            return res.end(HTTPResponse.serviceNotKnown);
        }

        if(config.secret_token !== req.get("ServiceToken")) {
            return res
              .status(HTTPStatus.Unauthorized)
              .end(HTTPResponse.serviceNotKnown);
        }


        if(services.length && service !== "admin" && !services.includes(service as IServiceID)) {
            return res
              .status(HTTPStatus.Forbidden)
              .end(HTTPResponse.serviceNotAuthorized);
        }

        res.locals.service = service;

        return next();
    }
}

export function logoutEndpoint(req: Express.Request, res: Express.Response) {
    if(req.cookies["token"] && usersByToken.has(req.cookies["token"])) {
        const info = usersByToken.get(req.cookies["token"]);
        usersByToken.delete(req.cookies["token"]);
        res.cookie("token", "", { maxAge: 0 });
        logDebug(`User(${info.user.uid}) session destroyed during logout`);
    }

    return res.redirect(`${AUTH_CONFIG.url}/logout`);
}