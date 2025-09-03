export class InvalidInputError extends Error {
    constructor(expected: string, actual: string, options?: ErrorOptions) {
        super(`Invalid input error -\nExpected: ${expected}\nActual: ${actual}`, options);
    }
}