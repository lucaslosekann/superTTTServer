//Allways use this class to throw errors in the controllers
//It will be catched by the ErrorMiddleware

const ErrorCodes = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    DUPLICATED: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    SERVICE_UNAVAILABLE: 503,
    NOT_IMPLEMENTED: 501
}

export default class HttpError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }

    static BadRequest(message: string) {
        return new HttpError(message, ErrorCodes.BAD_REQUEST);
    }

    static NotFound(message: string) {
        return new HttpError(message, ErrorCodes.NOT_FOUND);
    }

    static InternalServerError(message: string) {
        return new HttpError(message, ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    static UnprocessableEntity(message: string) {
        return new HttpError(message, ErrorCodes.UNPROCESSABLE_ENTITY);
    }

    static Duplicated(message: string) {
        return new HttpError(message, ErrorCodes.DUPLICATED);
    }

    static Unauthorized(message: string) {
        return new HttpError(message, ErrorCodes.UNAUTHORIZED);
    }

    static Forbidden(message: string) {
        return new HttpError(message, ErrorCodes.FORBIDDEN);
    }

    static TooManyRequests(message: string) {
        return new HttpError(message, ErrorCodes.TOO_MANY_REQUESTS);
    }

    static ServiceUnavailable(message: string) {
        return new HttpError(message, ErrorCodes.SERVICE_UNAVAILABLE);
    }

    static NotImplemented(message: string) {
        return new HttpError(message, ErrorCodes.NOT_IMPLEMENTED);
    }

}