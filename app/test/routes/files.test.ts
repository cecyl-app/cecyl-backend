import { describe, expect, test } from '@jest/globals';
import FormData from 'form-data'
import { Readable } from 'stream';

import build from '../../src/build-server.js'
import { ListFilesResponseBodySchema, UploadFilesResponseBodySchema } from '../../src/routes/files.js'
import * as extendedFastify from '../../src/types/index.js'

describe('search-files', () => {
    test('given an uploaded shared file, when deleted, then list API does not return it', async () => {
        const app = await build()

        // upload file
        const form = new FormData()
        form.append('search_file', Readable.from('test content'), { filename: 'test-search-file.txt' })

        const uploadFileResponse = await app.inject({
            method: 'POST',
            url: '/search-files/shared',
            headers: form.getHeaders(),
            body: form
        })

        const fileId = uploadFileResponse.json<UploadFilesResponseBodySchema>()[0].id
        console.log(`fileId: ${fileId}`)

        // list the uploaded files
        const listFilesResponse = await app.inject({
            method: 'GET',
            url: '/search-files/shared'
        });

        const fileInfo = listFilesResponse.json<ListFilesResponseBodySchema>()
            .find(file => file.id === fileId);
        expect(fileInfo).toBeDefined();

        console.log(`fileInfo: ${JSON.stringify(fileInfo)}`)

        // delete the uploaded file
        await app.inject({
            method: 'DELETE',
            url: `/search-files/shared/${fileId}`
        });

        // list again the uploaded files but now won't find the initial file
        const secondListFilesResponse = await app.inject({
            method: 'GET',
            url: '/search-files/shared'
        });

        expect(secondListFilesResponse.json<ListFilesResponseBodySchema>().some(file => file.id === fileId))
            .toBeFalsy();
    }, 30000);
});