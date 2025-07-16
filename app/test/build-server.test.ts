import { describe, expect, test } from '@jest/globals';

import build from '../src/build-server.js'
import * as extendedFastify from '../src/types/index.js'

describe('build-server', () => {
    test('when fastify instance is created, then decorators are available', async () => {
        const app = await build()

        console.log(`sharedVectorStoreId: ${app.sharedVectorStoreId}`)

        expect(app.openaiClient).toBeDefined()
        expect(app.sharedVectorStoreId).toBeDefined()
        expect(app.sharedVectorStoreId.length).toBeGreaterThan(0)
    });
});