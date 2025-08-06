import { expect } from '@jest/globals';

import { LightMyRequestResponse } from "fastify";

export class ResponseTestUtils {
    static assertStatus200(response: LightMyRequestResponse) {
        expect(response.statusCode).toBe(200)
    }

    static assertStatus201(response: LightMyRequestResponse) {
        expect(response.statusCode).toBe(201)
    }
}