import fs from 'fs'
import { setTimeout } from 'timers/promises';

import { FastifyInstance, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { FromSchema } from 'json-schema-to-ts';
import OpenAI from 'openai';
import { VectorStoreFile } from 'openai/resources/vector-stores/files.mjs';

/**
 * The file uploaded to a vector store is not immediately available. It must transit
 * to the `completed` state in order to be used. This function polls every 2.5 seconds
 * if the file is in the `completed` state
 * @param openAIClient OpenAI client
 * @param fileId file id
 * @param vectorStoreId vector store Id
 */
async function pollFileStatusForCompleted(openAIClient: OpenAI, fileId: string, vectorStoreId: string) {
    let vectorStoreFileStatus: OpenAI.VectorStores.Files.VectorStoreFile['status']
    let i = 0
    do {
        // after the first time, sleep for 2.5 seconds
        if (i > 0)
            await setTimeout(2500)

        const vectorStoreFile = await openAIClient.vectorStores.files.retrieve(
            vectorStoreId,
            fileId
        );
        vectorStoreFileStatus = vectorStoreFile.status

        i++;
    } while (vectorStoreFileStatus !== 'completed');
}


const uploadSharedFilesResponseBodySchema = {
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
type UploadSharedFilesResponseBodySchema = FromSchema<typeof uploadSharedFilesResponseBodySchema>;

async function uploadSharedFiles(
    request: FastifyRequest,
    reply: FastifyReply<{ Reply: UploadSharedFilesResponseBodySchema }>
): Promise<void> {
    const openaiClient = request.server.openaiClient
    const vectorStoredId = request.server.sharedVectorStoreId

    const files = await request.saveRequestFiles()

    const fileObjects = await Promise.all(files.map(async (f) => {
        // upload file to OpenAI
        const fileObject = await openaiClient.files.create({
            file: fs.createReadStream(f.filepath),
            purpose: "assistants",
        });

        // attach the file to the shared vector store
        await openaiClient.vectorStores.files.create(
            vectorStoredId,
            {
                file_id: fileObject.id,
            }
        );

        await pollFileStatusForCompleted(openaiClient, fileObject.id, vectorStoredId)

        return fileObject;
    }));

    const response = fileObjects.map(fo => ({
        id: fo.id,
        filename: fo.filename
    }))

    reply.status(201).send(response)
}


async function uploadProjectFiles(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {

}


export default async function routes(fastify: FastifyInstance, options: FastifyServerOptions) {
    fastify.post('/search-files/shared',
        {
            schema: {
                response: {
                    201: uploadSharedFilesResponseBodySchema
                }
            }
        },
        uploadSharedFiles)
}