import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

import build from '../src/build-server.js'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars --
 * TODO: types.d.ts is not imported in test/ files and can only be manually imported
 **/
import * as extendedFastify from '../src/types/index.js'


let app: FastifyInstance

beforeAll(async () => {
    app = await build()
})


afterAll(async () => {
    await app.close()
})


describe('build-server', () => {
    test('when fastify instance is created, then decorators are available', () => {
        console.log(`sharedVectorStoreId: ${app.sharedVectorStoreId}`)

        expect(app.openaiClient).toBeDefined()
        expect(app.sharedVectorStoreId).toBeDefined()
        expect(app.sharedVectorStoreId.length).toBeGreaterThan(0)
    });
});