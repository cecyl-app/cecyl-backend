import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody, GetProjectResponseBody, ListProjectsResponseBody } from '../../src/routes/projects.js'
import { RequestExecutor } from '../test-utils/RequestExecutor.js';
import { ConversationsTestUtils } from '../test-utils/ConversationsTestUtils.js';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars --
 * TODO: types.d.ts is not imported in test/ files and can only be manually imported
 **/
import * as extendedFastify from '../../src/types/index.js'
import { ResponseTestUtils } from '../test-utils/ResponseTestUtils.js';

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


describe('projects', () => {
    test('Create-Read-Delete workflow', async () => {
        const TEST_PROJECT_NAME = 'my test project'
        const TEST_PROJECT_CONTEXT = 'my project context'

        // create project
        const createProjectResponse = await RequestExecutor.createProject(app, {
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            language: 'english'
        })
        ResponseTestUtils.assertStatus201(createProjectResponse)

        const projectId = createProjectResponse.json<CreateProjectResponseBody>().id
        console.log(`projectId: ${projectId}`)

        // list projects
        const listProjectsResponse = await RequestExecutor.listProjects(app)
        ResponseTestUtils.assertStatus200(listProjectsResponse)

        let projects = listProjectsResponse.json<ListProjectsResponseBody>()
        expect(projects.map(p => p.id)).toContain(projectId)

        // get the project info
        const getProjectResponse = await RequestExecutor.getProjectInfo(app, projectId)
        ResponseTestUtils.assertStatus200(getProjectResponse)

        const projectInfo = getProjectResponse.json<GetProjectResponseBody>()
        expect(projectInfo).toMatchObject({
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            sections: []
        });

        // delete the project
        const deleteProjectResponse = await RequestExecutor.deleteProject(app, projectId)
        ResponseTestUtils.assertStatus200(deleteProjectResponse)

        // list projects after delete
        const listProjectsResponse2 = await RequestExecutor.listProjects(app)
        ResponseTestUtils.assertStatus200(listProjectsResponse)

        projects = listProjectsResponse2.json<ListProjectsResponseBody>()
        expect(projects.map(p => p.id)).not.toContain(projectId)
    }, 30000);

    test('given a project, when updateProject is called, then Project fields are modified', async () => {
        const TEST_PROJECT_NAME = 'my test project'
        const TEST_PROJECT_CONTEXT = 'my project context'

        // create project
        const createProjectResponse = await RequestExecutor.createProject(app, {
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            language: 'english'
        })

        const projectId = createProjectResponse.json<CreateProjectResponseBody>().id

        // update the project info
        const updateProjectResponse = await RequestExecutor.updateProjectInfo(app, projectId, {
            name: TEST_PROJECT_NAME + "-new",
            context: TEST_PROJECT_CONTEXT + "-new",
            sectionIdsOrder: [],
            language: 'italian'
        })
        ResponseTestUtils.assertStatus200(updateProjectResponse)

        // get the updated project info
        const getProjectNewResponse = await RequestExecutor.getProjectInfo(app, projectId)
        const projectNewInfo = getProjectNewResponse.json<GetProjectResponseBody>()
        expect(projectNewInfo).toMatchObject({
            name: TEST_PROJECT_NAME + "-new",
            context: TEST_PROJECT_CONTEXT + "-new",
            sections: []
        });

        // delete the project
        await RequestExecutor.deleteProject(app, projectId)
    }, 30000);
});