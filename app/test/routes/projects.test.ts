import { describe, expect, test } from '@jest/globals';
import FormData from 'form-data'
import { Readable } from 'stream';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody, GetProjectResponseBody, ListProjectsResponseBody } from '../../src/routes/projects.js'
import * as extendedFastify from '../../src/types/index.js'

describe('projects', () => {
    test('CRUD workflow', async () => {
        const app = await build()
        const TEST_PROJECT_NAME = 'test-project'
        const TEST_PROJECT_CONTEXT = 'test-context'

        // create project
        const createProjectResponse = await app.inject({
            method: 'POST',
            url: '/projects',
            body: {
                name: TEST_PROJECT_NAME,
                context: TEST_PROJECT_CONTEXT
            }
        })

        const projectId = createProjectResponse.json<CreateProjectResponseBody>().id
        console.log(`projectId: ${projectId}`)

        // list projects
        const listProjectsResponse = await app.inject({
            method: 'GET',
            url: '/projects'
        })

        let projects = listProjectsResponse.json<ListProjectsResponseBody>()
        expect(projects.map(p => p.id)).toContain(projectId)

        // get the project info
        const getProjectResponse = await app.inject({
            method: 'GET',
            url: `/projects/${projectId}`
        });

        const projectInfo = getProjectResponse.json<GetProjectResponseBody>()
        expect(projectInfo).toMatchObject({
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            sections: []
        });

        // delete the project
        await app.inject({
            method: 'DELETE',
            url: `/projects/${projectId}`
        });

        // list projects after delete
        const listProjectsResponse2 = await app.inject({
            method: 'GET',
            url: '/projects'
        })

        projects = listProjectsResponse2.json<ListProjectsResponseBody>()
        expect(projects.map(p => p.id)).not.toContain(projectId)
    }, 30000);
});