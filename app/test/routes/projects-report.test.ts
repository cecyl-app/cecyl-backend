import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody } from '../../src/routes/projects.js'
import { RequestExecutor } from '../test-utils/RequestExecutor.js';
import { ConversationsTestUtils } from '../test-utils/ConversationsTestUtils.js';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars --
 * TODO: types.d.ts is not imported in test/ files and can only be manually imported
 **/
import * as extendedFastify from '../../src/types/index.js'
import { ResponseTestUtils } from '../test-utils/ResponseTestUtils.js';
import { CreateSectionResponseBody } from '../../src/routes/projects-sections.js';

let app: FastifyInstance

beforeAll(async () => {
    app = await build({
        logger: {
            level: 'info'
        }
    });
})


afterAll(async () => {
    await ConversationsTestUtils.deleteAllConversations(app.conversationsRepo)

    await app.close()
})


describe('project report', () => {
    test('given a project, when the docx is generated, the response is 200', async () => {
        const TEST_PROJECT_NAME = 'my test project'
        const TEST_PROJECT_CONTEXT = 'my project context'

        // create project
        const createProjectResponse = await RequestExecutor.createProject(app, {
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            language: 'english'
        })

        const projectId = createProjectResponse.json<CreateProjectResponseBody>().id

        // create section
        const createSectionResponse = await RequestExecutor.createSection(app,
            projectId, { name: 'section 1' }
        )
        const sectionId = createSectionResponse.json<CreateSectionResponseBody>().id

        // fill section with response
        await RequestExecutor.sendAskPrompt(app, projectId, sectionId, {
            prompt: '1+1=?'
        })

        // generate report
        const generateDocxResponse = await RequestExecutor.generateDocx(app, projectId)
        ResponseTestUtils.assertStatus200(generateDocxResponse)
        expect(generateDocxResponse.rawPayload.byteLength).toBeGreaterThan(0)

        // delete the project
        await RequestExecutor.deleteProject(app, projectId)
    }, 30000);
});