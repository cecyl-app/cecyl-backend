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
import { ResponseTestUtils } from '../test-utils/ResponseTestUtils.js';

let app: FastifyInstance
const TEST_FILE_NAME = 'test-search-file.txt'

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
        let fileId = ''
        try {
            // upload file
            const form = new FormData()
            form.append('search_file', Readable.from('test content'), { filename: TEST_FILE_NAME })

            const uploadFileResponse = await RequestExecutor.uploadSharedFiles(app, form)
            ResponseTestUtils.assertStatus(uploadFileResponse, 201)

            fileId = uploadFileResponse.json<UploadFilesResponseBody>()[0].id
            console.log(`fileId: ${fileId}`)

            // list the uploaded files
            const listFilesResponse = await RequestExecutor.listSharedFiles(app)
            ResponseTestUtils.assertStatus(listFilesResponse, 200)

            const fileInfo = listFilesResponse.json<ListFilesResponseBody>()
                .find(file => file.id === fileId);
            expect(fileInfo).toBeDefined();
            expect(fileInfo?.filename).toBe(TEST_FILE_NAME)

            console.log(`fileInfo: ${JSON.stringify(fileInfo)}`)
        }
        catch (err) {
            if (fileId !== '') {
                // delete the uploaded file
                const deleteFileResponse = await RequestExecutor.deleteSharedFile(app, fileId)
                ResponseTestUtils.assertStatus(deleteFileResponse, 200)

                // list again the uploaded files but now won't find the initial file
                const secondListFilesResponse = await RequestExecutor.listSharedFiles(app)
                ResponseTestUtils.assertStatus(secondListFilesResponse, 200)

                expect(secondListFilesResponse.json<ListFilesResponseBody>().some(file => file.id === fileId))
                    .toBeFalsy();
            }

            throw err
        }
    }, 30000);
})


describe('search-files - project vector store', () => {
    let projectId: string

    beforeAll(async () => {
        const createProjectResponse = await RequestExecutor.createProject(app, {
            name: 'my project',
            context: 'my project context',
            language: 'italian'
        })

        projectId = createProjectResponse.json<CreateProjectResponseBody>().id
    })


    afterAll(async () => {
        await RequestExecutor.deleteProject(app, projectId)
    })


    test('CRUD workflow', async () => {
        let fileId = ''
        try {
            // upload file
            const form = new FormData()
            form.append('search_file', Readable.from('test content'), { filename: TEST_FILE_NAME })

            const uploadFileResponse = await RequestExecutor.uploadProjectFiles(app, projectId, form)
            ResponseTestUtils.assertStatus(uploadFileResponse, 201)

            fileId = uploadFileResponse.json<UploadFilesResponseBody>()[0].id
            console.log(`fileId: ${fileId}`)

            // list the uploaded files
            const listFilesResponse = await RequestExecutor.listProjectFiles(app, projectId)
            ResponseTestUtils.assertStatus(listFilesResponse, 200)

            const fileInfo = listFilesResponse.json<ListFilesResponseBody>()
                .find(file => file.id === fileId);
            expect(fileInfo).toBeDefined();
            expect(fileInfo?.filename).toBe(TEST_FILE_NAME)

            console.log(`fileInfo: ${JSON.stringify(fileInfo)}`)
        }
        catch (err) {
            if (fileId !== '') {
                // delete the uploaded file
                const deleteFileResponse = await RequestExecutor.deleteProjectFile(app, projectId, fileId)
                ResponseTestUtils.assertStatus(deleteFileResponse, 200)

                // list again the uploaded files but now won't find the initial file
                const secondListFilesResponse = await RequestExecutor.listProjectFiles(app, projectId)
                ResponseTestUtils.assertStatus(secondListFilesResponse, 200)

                expect(secondListFilesResponse.json<ListFilesResponseBody>().some(file => file.id === fileId))
                    .toBeFalsy();
            }

            throw err
        }
    }, 30000);
});