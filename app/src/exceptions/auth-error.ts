export class InvalidAuthCredentialsError extends Error {
    constructor(msg: string, options?: ErrorOptions) {
        super(msg, options);
    }
}


export class UnauthorizedUserError extends Error {
    constructor(user: string, options?: ErrorOptions) {
        super(`User "${user}" is not authorized to access the APIs`, options);
    }
}