export const HTTPStatus = {
    OK: 200,
    Created: 201,
    
    BadRequest: 400,
    Unauthorized: 401,
    Forbidden: 403,
    NotFound: 404,
    Conflict: 409,
    Teapot: 418,
    TooManyRequests: 429,

    InternalServerError: 500,
    ServiceUnavailable:  503,

};

const responseFooter = `

The Suite. https://github.com/jonasdoubleyou/suite.`;

export const HTTPResponse = {
    OK:
        `Action performed successfully` + responseFooter,
    serviceNotKnown:
        `This API Endpoint can only be used by other services.
         For that, both a 'Service' and a 'ServiceToken' header must be present.
         Either no service was presented, the service is not known, or the service token is invalid` + responseFooter,
    serviceNotAuthorized:
        `The service is not authorized to request this API Endpoint.
         It needs to be whitelisted in the middleware` + responseFooter,
    notAuthorized:
        `You need to be logged in to request this API Endpoint.` + responseFooter,
    notEnoughPermissions:
        `You do not have enough permissions to request this API Endpoint. Contact your administrator` + responseFooter,
    
    serverError:
        `Internal Server Error. Please contact your administrator for further information.` + responseFooter,
    apiNotFound:
        `The API Endpoint does not exist.` + responseFooter,
    notFound:
        `The requested resource does not exist on this server.` + responseFooter,
    created:
        `The request was performed and the resource was created successfully.` + responseFooter,
    missingParameter:
        (name: string) =>
            `The parameter '${name}' is missing.` + responseFooter,
    invalidParameter:
        (name: string) =>
            `The parameter '${name}' has an invalid value` + responseFooter,
    invalidParameters:
        (errors: { fieldPath: string, message: string }[]) => 
            `The parameters passed are invalid:\n${errors.map(({ fieldPath, message }) => `  ${fieldPath.padEnd(30, " ")} - ${message}\n`)}` + responseFooter,
};
