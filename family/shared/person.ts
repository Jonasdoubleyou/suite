export interface IPerson {
    uid: string;
    firstname: string,
    lastname: string,
    birthname?: string,
    birthdate?: number,
    deathdate?: number,
    marriages?: IMarriage[];
    children?: IOtherPerson[];
    parents?: IOtherPerson[];
}

export type IOtherPerson = Pick<IPerson, "firstname" | "lastname" | "uid">;

export interface IMarriage {
    startdate?: number;
    enddate?: number;
    other_uid: number;
    other_firstname: string;
    other_lastname: string;
}