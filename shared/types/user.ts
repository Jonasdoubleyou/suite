import { IServiceID } from "./service";

export interface IUser {
    username: string;
    uid: number;
    permissions: IPermission[];
}

export interface IPassword {
    uid: number;
    password: string;
    salt: string;
}

export interface IPermission {
    service: IServiceID,
    type:    "WRITER" | "READER" | string,
    value?:  string,
}