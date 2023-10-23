//Allways use this class to throw errors in the controllers
//It will be catched by the ErrorMiddleware

//Only successes 2xx
const ResponseCodes = {
    CREATED: 201,
    OK: 200,
    NO_CONTENT: 204
}

type Payload = {
    [key: string]: any
}

export default class HttpResponse {
    public payload: Payload;

    public statusCode: number;

    constructor(payload: Payload, statusCode: number = ResponseCodes.OK) {
        this.payload = payload;
        this.statusCode = statusCode;
    }

    static Created(payload: Payload) {
        return new HttpResponse(payload, ResponseCodes.CREATED);
    }

    static Ok(payload: Payload) {
        return new HttpResponse(payload, ResponseCodes.OK);
    }

    static NoContent() {
        return new HttpResponse({}, ResponseCodes.NO_CONTENT);
    }


}