import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import FormData from 'form-data'
import { Readable } from 'stream';
import { FastifyInstance } from 'fastify';

import build from '../../src/build-server.js'
import { ListFilesResponseBody, UploadFilesResponseBody } from '../../src/routes/files.js'
import { RequestExecutor } from '../test-utils/RequestExecutor.js';
import { CreateProjectResponseBody } from '../../src/routes/projects.js';
import { ConversationsTestUtils } from '../test-utils/ConversationsTestUtils.js';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars --
 * TODO: types.d.ts is not imported in test/ files and can only be manually imported
 **/
import * as extendedFastify from '../../src/types/index.js'

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


describe('search-files - shared vector store', () => {
    test('CRUD workflow', async () => {
        // upload file
        const form = new FormData()
        form.append('search_file', Readable.from('test content'), { filename: 'test-search-file.txt' })

        const uploadFileResponse = await RequestExecutor.uploadSharedFiles(app, form)

        const fileId = uploadFileResponse.json<UploadFilesResponseBody>()[0].id
        console.log(`fileId: ${fileId}`)

        // list the uploaded files
        const listFilesResponse = await RequestExecutor.listSharedFiles(app)

        const fileInfo = listFilesResponse.json<ListFilesResponseBody>()
            .find(file => file.id === fileId);
        expect(fileInfo).toBeDefined();

        console.log(`fileInfo: ${JSON.stringify(fileInfo)}`)

        // delete the uploaded file
        await RequestExecutor.deleteSharedFile(app, fileId)

        // list again the uploaded files but now won't find the initial file
        const secondListFilesResponse = await RequestExecutor.listSharedFiles(app)

        expect(secondListFilesResponse.json<ListFilesResponseBody>().some(file => file.id === fileId))
            .toBeFalsy();
    }, 30000);
})


describe('search-files - project vector store', () => {
    let projectId: string

    beforeAll(async () => {
        const createProjectResponse = await RequestExecutor.createProject(app,
            'my project', 'my project context')

        projectId = createProjectResponse.json<CreateProjectResponseBody>().id
        // console.log('projectId: ' + projectId)
    })


    test('CRUD workflow', async () => {
        // upload file
        const form = new FormData()
        form.append('search_file', Readable.from('test content'), { filename: 'test-search-file.txt' })

        const uploadFileResponse = await RequestExecutor.uploadProjectFiles(app, projectId, form)

        const fileId = uploadFileResponse.json<UploadFilesResponseBody>()[0].id
        console.log(`fileId: ${fileId}`)

        // list the uploaded files
        const listFilesResponse = await RequestExecutor.listProjectFiles(app, projectId)

        const fileInfo = listFilesResponse.json<ListFilesResponseBody>()
            .find(file => file.id === fileId);
        expect(fileInfo).toBeDefined();

        console.log(`fileInfo: ${JSON.stringify(fileInfo)}`)

        // delete the uploaded file
        await RequestExecutor.deleteProjectFile(app, projectId, fileId)

        // list again the uploaded files but now won't find the initial file
        const secondListFilesResponse = await RequestExecutor.listProjectFiles(app, projectId)

        expect(secondListFilesResponse.json<ListFilesResponseBody>().some(file => file.id === fileId))
            .toBeFalsy();
    }, 30000);


    afterAll(async () => {
        await RequestExecutor.deleteProject(app, projectId)
    })
});