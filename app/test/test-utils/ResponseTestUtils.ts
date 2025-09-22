import { expect } from '@jest/globals';

import { LightMyRequestResponse } from "fastify";

export class ResponseTestUtils {
    static assertStatus(response: LightMyRequestResponse, status: number) {
        expect(response.statusCode).toBe(status)
    }
}