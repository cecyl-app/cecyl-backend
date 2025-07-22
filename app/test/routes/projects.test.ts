import { describe, expect, test } from '@jest/globals';
import FormData from 'form-data'
import { Readable } from 'stream';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody, GetProjectResponseBody } from '../../src/routes/projects.js'
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
    }, 30000);
});