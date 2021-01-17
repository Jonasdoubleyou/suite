import * as Express from "express";
import { assert } from "./assert";
import { HTTPResponse, HTTPStatus } from "./http";

type IValidStringType = 
  "string" | "username" | "password";

type IValidNumberType = 
| "number" | "integer" | "positive-integer";

type IValidType = IValidStringType | IValidNumberType;

export interface IValidation { 
    [name: string]: 
      | IValidType
      | IValidation
      | { [ValidationArray]: IValidation; }
      | { [ValidationEither]: IValidation[]; }
      | { [ValidationOptional]: IValidation };
}


interface IErrorData { fieldPath: string, message: string, };

const ValidationArray:    unique symbol = Symbol.for("Validation.Array");
const ValidationOptional: unique symbol = Symbol.for("Validation.Optional");
const ValidationEither:   unique symbol = Symbol.for("Validation.Either");

export type IValidated<T extends IValidation> = {
    [K in keyof T]: 
      (T[K] extends IValidStringType ? string :
        (T[K] extends IValidNumberType ? number : 
            (T[K] extends { [ValidationArray]: any } ? IValidated<T[K][typeof ValidationArray]>[] : 
              (T[K] extends { [ValidationOptional]: any } ? (IValidated<T[K][typeof ValidationOptional]> | null): 
                (T[K] extends { [ValidationEither]: any } ? IValidated<T[K][typeof ValidationEither][number]> : 
                    never)))));
};

export const validateEither = 
  <A extends IValidation, B extends IValidation>(typeA: A, typeB: B) => 
    ({ [ValidationEither]: [typeA, typeB] as const });

export const validateOptional = 
  <A extends IValidation>(typeA: A) => ({ [ValidationOptional]: typeA });

export const validateArray = 
  <A extends IValidation>(typeA: A) => ({ [ValidationArray]: typeA });

export function validate<T extends IValidation>(validations: T, endpoint: (data: IValidated<T>, res: Express.Response) => void) {
  return function validationMiddleware(req: Express.Request, res: Express.Response) {
    

    function* _validate(input: object, validations: IValidation, path: string): Iterable<IErrorData> {
        for(let [field, validation] of Object.entries(validations)) {
            const fieldPath = `${path}.${field}`;

            if(validation[ValidationOptional]) {
                if(!(field in input)) continue;
                validation = validation[ValidationOptional];
            } else if(!(field in input)) {
                yield { fieldPath, message: `Missing required parameter`, };
                continue;
            }

            const value = input[field];

            if(validation[ValidationArray]) {
              if(!Array.isArray(value)) {
                  yield { fieldPath, message: `Must be an array`};
                  continue;
              }

              for(const [index, subInput] of value.entries())
                yield* _validate(subInput, validation[ValidationArray], `${path}[${index}]`);
            } else if(validation[ValidationEither]) {
                const results = validation[ValidationEither].map(option => [..._validate(input, option, path)]);
                if(results.every(result => result.length)) {
                    yield* results[0];
                }
            } else if(validation === "integer") {
                if(typeof value !== "number" || !Number.isInteger(value))
                  yield { fieldPath, message: `Must be Integer`};
            } else if(validation === "number") {
                if(typeof value !== "number")
                  yield { fieldPath, message: `Must be Number` };
            } else if(validation === "positive-integer") {
                if(typeof value !== "number" || !Number.isInteger(value) || value < 0)
                  yield { fieldPath, message: `Must be positive Integer`};
            } else if(validation === "string") {
                if(typeof value !== "string")
                  yield { fieldPath, message: `Must be String`};
            } else if(validation === "password") {
                if(typeof value !== "string" || value.length < 10)
                  yield { fieldPath, message: `Password must be a string with more than 10 characters` };
            } else if(validation === "username") {
                if(typeof value !== "string" || value.length < 10)
                  yield { fieldPath, message: `Username must be a string with more than 10 characters` }
            } else {
                assert("Validation not covered", false);
            }
        }
    }

    const errors = [..._validate(req.body, validations, "body")];

    if(!errors.length)
      return endpoint(req.body as IValidated<T>, res);

    return res
      .status(HTTPStatus.BadRequest)
      .end(HTTPResponse.invalidParameters(errors));
  }

}
