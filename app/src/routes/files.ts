import fs from 'fs'
import { setTimeout } from 'timers/promises';

import { FastifyInstance, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { FromSchema } from 'json-schema-to-ts';
import OpenAI from 'openai';

/**
 * The file uploaded to a vector store is not immediately available. It must transit
 * to the `completed` state in order to be used. This function polls every 2.5 seconds
 * if the file is in the `completed` state
 * @param openAIClient OpenAI client
 * @param fileId file id
 * @param vectorStoreId vector store Id
 */
async function pollFileStatusForCompleted(openaiClient: OpenAI, fileId: string, vectorStoreId: string) {
    let vectorStoreFileStatus: OpenAI.VectorStores.Files.VectorStoreFile['status']
    let firstTimePoll = true
    do {
        // after the first time, sleep for 2.5 seconds
        if (!firstTimePoll)
            await setTimeout(2500)

        const vectorStoreFile = await openaiClient.vectorStores.files.retrieve(
            vectorStoreId,
            fileId
        );
        vectorStoreFileStatus = vectorStoreFile.status

        firstTimePoll = false;
    } while (vectorStoreFileStatus !== 'completed');
}


const uploadFilesResponseBodySchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            filename: { type: 'string' }
        },
        required: ['id', 'filename'],
    }
} as const;
export type UploadFilesResponseBody = FromSchema<typeof uploadFilesResponseBodySchema>;

/**
 * Upload a new file to the specified vectore store
 * @param vectorStoreId 
 * @param request 
 * @param reply 
 */
async function uploadFiles(
    vectorStoreId: string,
    request: FastifyRequest,
    reply: FastifyReply<{ Reply: UploadFilesResponseBody }>
): Promise<void> {
    const openaiClient = request.server.openaiClient

    const files = await request.saveRequestFiles()

    const fileObjects = await Promise.all(files.map(async (f) => {
        // upload file to OpenAI
        const fileObject = await openaiClient.files.create({
            file: fs.createReadStream(f.filepath),
            purpose: "assistants",
        });

        // attach the file to the shared vector store
        await openaiClient.vectorStores.files.create(
            vectorStoreId,
            {
                file_id: fileObject.id,
            }
        );

        // wait until the file status is completed
        await pollFileStatusForCompleted(openaiClient, fileObject.id, vectorStoreId)

        return fileObject;
    }));

    const response = fileObjects.map(fo => ({
        id: fo.id,
        filename: fo.filename
    }))

    reply.status(201).send(response)
}


const listFilesResponseBodySchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            filename: { type: 'string' },
            size: { type: 'string' }
        },
        required: ['id', 'filename', 'size'],
    }
} as const;
export type ListFilesResponseBody = FromSchema<typeof listFilesResponseBodySchema>;

/**
 * List files in the specified vectore store
 * @param vectorStoreId 
 * @param request 
 * @param reply 
 */
async function listFiles(
    vectorStoreId: string,
    request: FastifyRequest,
    reply: FastifyReply<{ Reply: ListFilesResponseBody }>
): Promise<void> {
    const openaiClient = request.server.openaiClient

    // TODO: currently supports 100 files per vector store, if there are more, aggregate from
    // the next pages. See `files.iterPages()`.
    const files = await openaiClient.vectorStores.files.list(vectorStoreId, { limit: 100 });

    // for each file, get info like the filename and size
    const response = await Promise.all(files.data.map(async (file) => {
        const fileInfo = await openaiClient.files.retrieve(file.id);

        return {
            id: fileInfo.id,
            filename: fileInfo.filename,
            size: `${fileInfo.bytes} Bytes`
        }
    }))

    reply.status(200).send(response)
}


const deleteFileRequestParamsSchema = {
    type: 'object',
    properties: {
        fileId: { type: 'string' }
    },
    required: ['fileId'],
} as const;
export type DeleteFileRequestParams = FromSchema<typeof deleteFileRequestParamsSchema>;

/**
 * delete a file from the specified vectore store
 * @param vectorStoreId 
 * @param request 
 * @param reply 
 */
async function deleteFile(
    vectorStoreId: string,
    request: FastifyRequest<{ Params: DeleteFileRequestParams }>,
    reply: FastifyReply
): Promise<void> {
    const openaiClient = request.server.openaiClient
    const fileId = request.params.fileId

    await openaiClient.vectorStores.files.del(vectorStoreId, fileId);
    await openaiClient.files.del(fileId);

    reply.status(200).send()
}


export default async function routes(fastify: FastifyInstance, options: FastifyServerOptions) {
    fastify.post<{ Reply: UploadFilesResponseBody }>(
        '/search-files/shared',
        {
            schema: {
                // multi-part content with one file per part
                response: {
                    201: uploadFilesResponseBodySchema
                }
            }
        },
        async (request, reply) => await uploadFiles(fastify.sharedVectorStoreId, request, reply))


    fastify.get<{ Reply: ListFilesResponseBody }>(
        '/search-files/shared',
        {
            schema: {
                response: {
                    200: listFilesResponseBodySchema
                }
            }
        },
        async (request, reply) => await listFiles(fastify.sharedVectorStoreId, request, reply))


    fastify.delete<{ Params: DeleteFileRequestParams }>(
        '/search-files/shared/:fileId',
        {
            schema: {
                params: deleteFileRequestParamsSchema
            }
        },
        async (request, reply) => await deleteFile(fastify.sharedVectorStoreId, request, reply))
}