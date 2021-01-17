export type IServiceID =
    "admin" | "login" | "family";

export interface IService {
    id?: IServiceID;
    name: string;
    url: string;
    secret_token: string;
    db_user?: string;
    db_password?: string;
    port: number;
};

export interface IGlobalConfig {
    db_host: string;
    db_database: string;
    db_port: number;
}