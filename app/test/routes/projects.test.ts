import { describe, expect, test, beforeAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody, GetProjectResponseBody, ListProjectsResponseBody } from '../../src/routes/projects.js'
import * as extendedFastify from '../../src/types/index.js'
import { RequestExecutor } from '../test-utils/RequestExecutor.js';


let app: FastifyInstance

beforeAll(async () => {
    app = await build({
        logger: {
            level: 'info'
        }
    });
})


describe('projects', () => {
    test('CRUD workflow', async () => {
        const TEST_PROJECT_NAME = 'test-project'
        const TEST_PROJECT_CONTEXT = 'test-context'

        // create project
        const createProjectResponse = await RequestExecutor.createProject(app,
            TEST_PROJECT_NAME, TEST_PROJECT_CONTEXT)

        const projectId = createProjectResponse.json<CreateProjectResponseBody>().id
        console.log(`projectId: ${projectId}`)

        // list projects
        const listProjectsResponse = await RequestExecutor.listProjects(app)

        let projects = listProjectsResponse.json<ListProjectsResponseBody>()
        expect(projects.map(p => p.id)).toContain(projectId)

        // get the project info
        const getProjectResponse = await RequestExecutor.getProjectInfo(app, projectId)

        const projectInfo = getProjectResponse.json<GetProjectResponseBody>()
        expect(projectInfo).toMatchObject({
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            sections: []
        });

        // delete the project
        await RequestExecutor.deleteProject(app, projectId)

        // list projects after delete
        const listProjectsResponse2 = await RequestExecutor.listProjects(app)

        projects = listProjectsResponse2.json<ListProjectsResponseBody>()
        expect(projects.map(p => p.id)).not.toContain(projectId)
    }, 30000);
});