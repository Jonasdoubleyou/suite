import { Client, Connection } from "pg";
import * as Express from "express";
import { assert } from "./assert";
import { logAndFail, logDebug, logError } from "./log";
import { HTTPResponse, HTTPStatus } from "./http";
import { IService } from "../types/service";
import { getGlobalConfig } from "./config";

let client: Client;

export async function connectDB(service: IService) {
  const globalConfig = getGlobalConfig();
  try {
    client = new Client({
        host: globalConfig.db_host,
        user: service.db_user,
        password: service.db_password,
        database: globalConfig.db_database,
        port: globalConfig.db_port,
    });
    logDebug(`Connecting to database ${client.database} as ${client.user} on ${client.host}`);
    await client.connect();
  } catch(error) {
    logAndFail(`Failed to connect to PostgreSQL database`, error);
  }
}

export async function getSingleResult<T>(query: string, ...values: string[]): Promise<T | undefined> {
    const result = await client.query(query + " LIMIT 1", values);
    assert("getSingle only returns one or no result", result.rowCount <= 1);
    return result.rows[0];
}

export async function getResult<T>(query: string, ...values: string[]): Promise<T[]> {
    const result = await client.query(query, values);
    return result.rows;
}

export function selectSingle<T = any>(table: string, options: { fields?: string[], join?: string, enrich?: (entry: T) => Promise<void> | void } = {}) {

    const fields = options?.fields?.join(", ") || "*";
    const query = `SELECT ${fields} FROM ${table} ${options.join || ""} WHERE uid = :uid LIMIT 1;`;
    logDebug(`generated select single query:`, query);

    return async function selectSingleEndpoint(req: Express.Request, res: Express.Response) {
        
        const { uid } = req.params;

        try {
            const result = await client.query(query, [uid]);
            assert("Select single returns one result", result.rows.length === 1);
            const entry = result.rows[0];
            if(options.enrich)
                await options.enrich(entry); 

            return res.json(entry);
        } catch(error) {
            logError(`Failed to select single from ${table}`, error);
            return res
                .status(HTTPStatus.InternalServerError)
                .send(HTTPResponse.serverError);
        }
    };
}

export function insertSingle(table: string, ...fields: string[]) {
    const query = `INSERT INTO ${table}(${fields.join(", ")}) VALUES (${fields.map(it => ":" + it).join(", ")})`;
    logDebug(`generated insertSingle query:`, query);

    return async function insertSingleMiddleware(req: Express.Request, res: Express.Response) {
        const values: string[] = [];
        for(const field of fields) {
            if(!(field in req.body)) {
                return res.status(HTTPStatus.BadRequest)
                          .send(HTTPResponse.missingParameter(field));
            }

            values.push(req.body[field]);
        }

        try {
            await client.query(query, values);

            return res
              .status(HTTPStatus.Created)
              .send(HTTPResponse.created);

        } catch(error) {
            return res
              .status(HTTPStatus.InternalServerError)
              .send(HTTPResponse.serverError);
        }
    }
}

export function updateSingle(table: string, ...possibleFields: string[]) {
    return async function updateSingleMiddleware(req: Express.Request, res: Express.Response) {
        const { uid } = req.params;

        const fields = [], values = [];

        for(const possibleField of possibleFields) {
            if(!(possibleField in req.body)) continue;

            fields.push(possibleField);
            values.push(req.body[possibleField]);
        }

        if(!fields.length) {
            return res
                .status(HTTPStatus.BadRequest)
                .send(HTTPResponse.missingParameter("any"));
        }

        try {
            const query = `UPDATE ${table} SET (${fields.join(", ")}) = (${fields.map(it => ":" + it).join(", ")}) WHERE uid = :uid`;
            logDebug(`updateSingle generated query: `, query);
            logDebug(`updateSingle generated values: `, values);
            await client.query(query, [...values, uid]);

            return res.status(HTTPStatus.OK)
                      .send(HTTPResponse.OK);
        } catch(error) {
            logError(`Failed to update single in ${table}`, error);
            return res
                .status(HTTPStatus.InternalServerError)
                .send(HTTPResponse.serverError);
        }
    }
}