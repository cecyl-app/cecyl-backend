import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody, GetProjectResponseBody } from '../../src/routes/projects.js'
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


describe('project sections', () => {
    let projectId: string

    beforeAll(async () => {
        const createProjectResponse = await RequestExecutor.createProject(app, {
            name: 'my project',
            context: 'my project context',
            language: 'italian'
        })

        projectId = createProjectResponse.json<CreateProjectResponseBody>().id
    })

    test('CRUD workflow', async () => {
        const TEST_SECTION_NAME = 'test section'

        // create section
        const createSectionResponse = await RequestExecutor.createSection(app, projectId, {
            name: TEST_SECTION_NAME
        })
        ResponseTestUtils.assertStatus201(createSectionResponse)
        const sectionId = createSectionResponse.json<CreateSectionResponseBody>().id
        expect(sectionId).toBeDefined()

        // get project info
        const getProjectInfoResponse = await RequestExecutor.getProjectInfo(app, projectId)

        let project = getProjectInfoResponse.json<GetProjectResponseBody>()
        let section = project.sections.find(s => s.id === sectionId)
        expect(section).toBeDefined()
        expect(section).toMatchObject({
            id: sectionId,
            name: TEST_SECTION_NAME,
            history: []
        })

        // delete section
        const deleteSectionResponse = await RequestExecutor.deleteSection(app, projectId, sectionId)
        ResponseTestUtils.assertStatus200(deleteSectionResponse)

        // get the project info
        const getProjectInfoResponse2 = await RequestExecutor.getProjectInfo(app, projectId)

        project = getProjectInfoResponse2.json<GetProjectResponseBody>()
        section = project.sections.find(s => s.id === sectionId)
        expect(section).toBeUndefined()
    }, 30000);

    afterAll(async () => {
        await RequestExecutor.deleteProject(app, projectId)
    })
});