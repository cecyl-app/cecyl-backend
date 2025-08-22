import fs, { ReadStream } from 'fs'

import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from 'json-schema-to-ts';

import { OpenAIService } from '../services/OpenAIService.js';
import { ProjectsRepository } from '../repositories/ProjectsRepository.js';
import { VectorStoreId } from '../types/openAI.js';
import { ProjectNotFound } from '../exceptions/project-errors.js';
import { ConversationNotFoundError } from '../exceptions/conversation-errors.js';
import { FileUtils } from '../utils/file-utils.js';
import { join } from 'path';
import { pipeline } from 'stream/promises';


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectsRepo = fastify.projectsRepo
    const openAIService = fastify.openAIService

    // *********************************************
    // APIs for search files in the shared vector store
    // *********************************************
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
        async (request, reply) => {
            const parts = request.files()
            const fileStreams: ReadStream[] = []

            await using tmpDir = await FileUtils.mkdtempDisposable()

            for await (const part of parts) {
                const filePath = join(tmpDir.path, part.filename)
                const savedFileStream = fs.createWriteStream(filePath)
                await pipeline(part.file, savedFileStream)
                fileStreams.push(fs.createReadStream(filePath))
            }

            const result = await uploadFiles(fileStreams, openAIService.sharedVectorStoreId, openAIService)

            reply.status(201).send(result)
        })


    fastify.get<{ Reply: ListFilesResponseBody }>(
        '/search-files/shared',
        {
            schema: {
                response: {
                    200: listFilesResponseBodySchema
                }
            }
        },
        async (request, reply) => {
            const result = await listFiles(openAIService.sharedVectorStoreId, openAIService)

            reply.status(200).send(result)
        })


    fastify.delete<{ Params: DeleteSharedFileRequestParams }>(
        '/search-files/shared/:fileId',
        {
            schema: {
                params: deleteSharedFileRequestParamsSchema
            }
        },
        async (request, reply) => {
            const fileId = request.params.fileId

            await deleteFile(openAIService.sharedVectorStoreId, fileId, openAIService);

            reply.status(200).send()
        })


    // *********************************************
    // APIs for search files in the project vector store
    // *********************************************
    fastify.post<{ Params: UploadProjectFilesRequestParams, Reply: UploadFilesResponseBody }>(
        '/projects/:projectId/search-files',
        {
            schema: {
                params: uploadProjectFilesRequestParamsSchema,
                // multi-part content with one file per part
                response: {
                    201: uploadFilesResponseBodySchema
                }
            }
        },
        async (request, reply) => {
            const vectorStoreId = await getVectorStoreIdFromProjectId(request.params.projectId, projectsRepo)
            const parts = request.files()
            const fileStreams: ReadStream[] = []

            await using tmpDir = await FileUtils.mkdtempDisposable()

            for await (const part of parts) {
                const filePath = join(tmpDir.path, part.filename)
                const savedFileStream = fs.createWriteStream(filePath)
                await pipeline(part.file, savedFileStream)
                fileStreams.push(fs.createReadStream(filePath))
            }

            const result = await uploadFiles(fileStreams, vectorStoreId, openAIService)

            reply.status(201).send(result)
        })


    fastify.get<{ Params: ListProjectFilesRequestParams, Reply: ListFilesResponseBody }>(
        '/projects/:projectId/search-files',
        {
            schema: {
                params: listProjectFilesRequestParamsSchema,
                response: {
                    200: listFilesResponseBodySchema
                }
            }
        },
        async (request, reply) => {
            const vectorStoreId = await getVectorStoreIdFromProjectId(request.params.projectId, projectsRepo)

            const result = await listFiles(vectorStoreId, openAIService)

            reply.status(200).send(result)
        })


    fastify.delete<{ Params: DeleteProjectFileRequestParams }>(
        '/projects/:projectId/search-files/:fileId',
        {
            schema: {
                params: deleteProjectFileRequestParamsSchema
            }
        },
        async (request, reply) => {
            const fileId = request.params.fileId
            const vectorStoreId = await getVectorStoreIdFromProjectId(request.params.projectId, projectsRepo)

            await deleteFile(vectorStoreId, fileId, openAIService);

            reply.status(200).send()
        })


    fastify.setErrorHandler(function (error, request, reply) {
        fastify.log.error(error)

        if ([ProjectNotFound, ConversationNotFoundError].some(etype => error instanceof etype))
            reply.status(404).send({ message: error.message })
    })
}


const uploadProjectFilesRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId']
} as const;
export type UploadProjectFilesRequestParams = FromSchema<typeof uploadProjectFilesRequestParamsSchema>;

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
    fileStreams: ReadStream[],
    vectorStoreId: string,
    openAIService: OpenAIService
): Promise<UploadFilesResponseBody> {
    const fileObjects = await Promise.all(fileStreams.map(async (fStream) => {
        const fileObject = await openAIService.uploadFile(fStream)

        await openAIService.attachFileToVectorStore(vectorStoreId, fileObject.id, true)

        return fileObject;
    }));

    const result = fileObjects.map(fo => ({
        id: fo.id,
        filename: fo.filename
    }))

    return result
}


const listProjectFilesRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId']
} as const;
export type ListProjectFilesRequestParams = FromSchema<typeof listProjectFilesRequestParamsSchema>;

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
 * List files in the specified vector store
 * @param vectorStoreId 
 * @param request 
 * @param reply 
 */
async function listFiles(
    vectorStoreId: string,
    openAIService: OpenAIService
): Promise<ListFilesResponseBody> {
    const files = await openAIService.listFilesInVectorStore(vectorStoreId)

    const result = await Promise.all(files.map(async (file) => {
        const fileInfo = await openAIService.getFileInfo(file.id);

        return {
            id: fileInfo.id,
            filename: fileInfo.filename,
            size: `${fileInfo.bytes} Bytes`
        }
    }))

    return result
}


const deleteProjectFileRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' },
        fileId: { type: 'string' }
    },
    required: ['fileId', 'projectId'],
} as const;
export type DeleteProjectFileRequestParams = FromSchema<typeof deleteProjectFileRequestParamsSchema>;

const deleteSharedFileRequestParamsSchema = {
    type: 'object',
    properties: {
        fileId: { type: 'string' }
    },
    required: ['fileId'],
} as const;
export type DeleteSharedFileRequestParams = FromSchema<typeof deleteSharedFileRequestParamsSchema>;

/**
 * delete a file from the specified vectore store
 * @param vectorStoreId 
 * @param request 
 * @param reply 
 */
async function deleteFile(
    vectorStoreId: string,
    fileId: string,
    openAIService: OpenAIService
): Promise<void> {
    await openAIService.removeFileFromVector(fileId, vectorStoreId)
    await openAIService.deleteFile(fileId)
}


async function getVectorStoreIdFromProjectId(
    projectId: string,
    projectsRepo: ProjectsRepository
): Promise<VectorStoreId> {
    const project = await projectsRepo.getProject(projectId, ['vectorStoreId'])

    if (project === null)
        throw new ProjectNotFound(projectId)

    return project.vectorStoreId
}