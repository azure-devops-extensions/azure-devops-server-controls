
import { WrappedException } from "VSS/WebApi/Contracts";

/** Typed client error from clients */
export interface IHttpServerError extends Error {
    status: number;
    serverError: WrappedException;
}

export class HttpClientError implements Error {
    private _innerError: Error;

    constructor(innerError: Error) {
        this._innerError = innerError;
    }

    public get name(): string {
        return this._innerError.name;
    }

    public get message(): string {
        return this._innerError.message;
    }

    public get stack(): string | undefined {
        return this._innerError.stack;
    }

    public get innerError(): Error {
        return this._innerError;
    }
}

export class HttpServerError extends HttpClientError {
    constructor(serverError: IHttpServerError) {
        super(serverError);
    }

    public get status(): number {
        return (this.innerError as IHttpServerError).status;
    }

    public get typeKey(): string {
        return (this.innerError as IHttpServerError).serverError.typeKey;
    }
}

/** Resolve to client error if possible
 * @param err
 */
function resolveHttpServerError(err: any): IHttpServerError {
    if (err.status && err.serverError) {
        return err as IHttpServerError;
    }
    throw err;
}

export async function wrapHttpServerError<T>(promise: PromiseLike<T>): Promise<T> {
    try {
        return await promise;
    } catch (rejected) {
        const serverError = resolveHttpServerError(rejected);
        throw new HttpServerError(serverError);
    }
}

export async function wrapHttpClientError<T>(promise: IPromise<T>): Promise<T> {
    try {
        return await promise;
    } catch (rejected) {
        try {
            const serverError = resolveHttpServerError(rejected);
            throw new HttpServerError(serverError);
        } catch (e) {
            throw new HttpClientError(e);
        }
    }
}

/** Options to create HttpErrorMapper<T> */
export interface IHttpServerErrorHandlerOption<T> {
    /**
     * HTTP Status code to be matched
     */
    status?: number;

    /** Server error type key to be matched */
    typeKey?: string;

    /**
     * Accept the error or not, overrides status and typeKey (optional)
     */
    acceptError?: (err: HttpServerError) => boolean;

    /**
     * Function to handle matched error
     */
    handle(err: HttpServerError): T;
}

/**
 * Http server error handler
 */
export class HttpServerErrorHandler<T> {
    private opts: Array<IHttpServerErrorHandlerOption<T>>;
    private instance: (err: any) => T;

    constructor(opts: Array<IHttpServerErrorHandlerOption<T>>) {
        this.opts = opts;
    }

    /**
     * compatible with Q.catch
     */
    public get handleError(): (err: any) => T {
        if (!this.instance) {
            this.instance = (err: any): T => {
                if (err.responseText) {
                    err.message = err.responseText;
                }
                const serverError = err as HttpServerError;
                for (const opt of this.opts) {
                    if (opt.acceptError) {
                        if (opt.acceptError) {
                            return opt.handle(serverError);
                        }
                    } else {
                        if (opt.status === serverError.status && (!opt.typeKey || opt.typeKey === serverError.typeKey)) {
                            return opt.handle(serverError);
                        }
                    }
                }
                // error not handled, throw
                throw err;
            };
        }
        return this.instance;
    }
}
