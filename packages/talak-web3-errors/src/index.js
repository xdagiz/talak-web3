export class TalakWeb3Error extends Error {
    code;
    status;
    data;
    cause;
    constructor(message, opts) {
        super(message, { cause: opts.cause });
        this.name = "TalakWeb3Error";
        this.code = opts.code;
        this.status = opts.status ?? 500;
        this.cause = opts.cause;
    }
}
export class AuthError extends TalakWeb3Error {
    constructor(message = "Unauthorized") {
        super(message, { code: "AUTH", status: 401 });
        this.name = "AuthError";
    }
}
