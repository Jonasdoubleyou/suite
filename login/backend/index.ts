import { getConfig } from "../../shared/backend/config";
import { setupServer } from "../../shared/backend/server";
import { IService, IServiceID } from "../../shared/types/service";
import { pbkdf2Sync, randomBytes } from "crypto";
import { IPassword, IUser } from "../../shared/types/user";
import { hasPermission, serviceAuth } from "../../shared/backend/auth";
import { HTTPResponse, HTTPStatus } from "../../shared/backend/http";
import * as jwt from "jsonwebtoken";
import * as Express from "express";
import { getSingleResult } from "./../../shared/backend/postgres";
import { IValidation, validate, validateEither, validateOptional } from "../../shared/backend/validate";

const { apiRoute, adminRoute } = setupServer("login");

const SECRET = randomBytes(100);

const UserCreateData = {
  username: "username",
  authentication: validateEither(
    { password: "password" },
    { publicKey: "string" },
  ),
} as const;

apiRoute.post("/create-verified", serviceAuth("admin").orUserAuth("login"), hasPermission("login", "ACCOUNT_ADMIN").or("login", "ACCOUNT_MANAGER"), validate(UserCreateData, (data, res) => {
  if("password" in data.authentication)
    data.authentication.password;
}));

apiRoute.post("/login", async (req, res) => {
  const { username, method, password } = req.body;

  const user = await getSingleResult<IUser>(`SELECT * FROM login_user WHERE username = :username`, username);

  if(!user) {
      return res.status(HTTPStatus.BadRequest).end(HTTPResponse.invalidParameter("username or authentication"));
  }

  if(method === "password") {
     const authentication = await getSingleResult<IPassword>(`SELECT * FROM login_auth_password WHERE uid = :uid`, user.uid.toString());

     if(!authentication) {
         return res.status(HTTPStatus.BadRequest).end(HTTPResponse.invalidParameter("username or authentication"));
     }

     if(password !== hashPassword(authentication.password, authentication.salt)) {
         return res.status(HTTPStatus.BadRequest).end(HTTPResponse.invalidParameter("username or authentication"));
     }

     // Logged in successfully with password
  } else {
      return res.status(HTTPStatus.BadRequest).end(HTTPResponse.invalidParameter("method"));
  }

  return res
    .cookie("session", jwt.sign(user, SECRET))
    .status(HTTPStatus.OK)
    .end(HTTPResponse.OK);
});

function userAuth(req: Express.Request, res: Express.Response, next: () => void) {
  const cookie = req.cookies["session"];

  try {
    if(!cookie) throw new Error("No cookie passed");

    const user = jwt.verify(cookie, SECRET);
    res.locals = { user };
    return next();
  } catch(error) {
      return res.status(HTTPStatus.Unauthorized)
                .send(HTTPResponse.notAuthorized);
  }
}

apiRoute.get("/redirect/:service", userAuth, (req, res) => {
   const { service } = req.params;
   const config = getConfig(service);
   if(!config) {
       return res.redirect("/error?type=unknown_service");
   }

   const token = createServiceToken(config, res.locals.user);

   return res.redirect(`${config.url}/?token=${token}`);
});

apiRoute.post("/verify-token", serviceAuth(/* any */), (req, res) => {
  const { token } = req.body;
  const { service } = res.locals;

  const tokens = serviceTokens[service as IServiceID];

  if(!tokens || !tokens[token]) {
    return res
      .status(HTTPStatus.BadRequest)
      .end(HTTPResponse.invalidParameter("token"));
  }

  const { user, loginTime } = tokens[token];
  delete tokens[token];

  return res.json({ user });
});

// token used to exchange user identity with a certain service
type IServiceToken = string;

const serviceTokens: { [service in IServiceID]?: { [token in IServiceToken]: { loginTime: number, user: IUser }}} = {};

function createServiceToken(service: IService, user: IUser): IServiceToken {

  if(!serviceTokens[service.id])
    serviceTokens[service.id] = {};

  let token: IServiceToken;

  do {
    token = randomBytes(36).toString("hex");
  } while(token in serviceTokens[service.id]);

  serviceTokens[service.id][token] = { user, loginTime: Date.now() };

  return token;
}

function hashPassword(cleartext: string, salt: string) {
    return pbkdf2Sync(cleartext, salt, 20, 50, "sha512");
}