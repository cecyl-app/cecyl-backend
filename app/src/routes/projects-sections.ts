import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { OpenAIService } from "../third-party/OpenAIService.js";
import { ConversationsRepository } from "../repositories/ConversationsRepository.js";
import constants from "../constants.js";
import { ProjectNotFound } from "../exceptions/project-errors.js";
import { ConversationNotFoundError } from "../exceptions/conversation-errors.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectsRepo = fastify.projectsRepo
    const conversationsRepo = fastify.conversationsRepo
    const openAIService = fastify.openAIService

    fastify.post<{ Body: CreateSectionRequestBody, Params: CreateSectionRequestParams, Reply: CreateSectionResponseBody }>(
        '/projects/:projectId/sections',
        {
            schema: {
                body: createSectionRequestBodySchema,
                params: createSectionRequestParamsSchema,
                response: {
                    201: createSectionResponseBodySchema
                }
            }
        },
        async (request, reply) => {
            const sectionInfo = {
                projectId: request.params.projectId,
                name: request.body.name
            }
            const result = await createSection(sectionInfo, projectsRepo)

            reply.status(201).send(result)
        }
    )

    fastify.post<{ Body: CreateSectionRequestBody, Params: CreateSectionRequestParams, Reply: CreateSectionResponseBody }>(
        '/projects/:projectId/sections/:sectionId/prompt',
        {
            schema: {
                body: createSectionRequestBodySchema,
                params: createSectionRequestParamsSchema,
                response: {
                    201: createSectionResponseBodySchema
                }
            }
        },
        async (request, reply) => {
            const sectionInfo = {
                projectId: request.params.projectId,
                name: request.body.name
            }
            const result = await createSection(sectionInfo, projectsRepo)

            reply.status(201).send(result)
        }
    )

    fastify.delete<{ Params: DeleteSectionRequestParams }>(
        '/projects/:projectId/sections/:sectionId',
        {
            schema: {
                params: deleteSectionRequestParamsSchema
            }
        },
        async (request, reply) => {
            const sectionInfo = {
                projectId: request.params.projectId,
                sectionId: request.params.sectionId
            }
            await deleteSection(sectionInfo, projectsRepo)

            reply.status(200).send()
        }
    )

    fastify.setErrorHandler(function (error, request, reply) {
        fastify.log.error(error)

        if ([ProjectNotFound, ConversationNotFoundError].some(etype => error instanceof etype))
            reply.status(404).send({ message: error.message })
    })
}


const createSectionRequestBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' }
    },
    required: ['name']
} as const;
export type CreateSectionRequestBody = FromSchema<typeof createSectionRequestBodySchema>;

const createSectionRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId']
} as const;
export type CreateSectionRequestParams = FromSchema<typeof createSectionRequestParamsSchema>;

const createSectionResponseBodySchema = {
    type: 'object',
    properties: {
        id: { type: 'string' }
    },
    required: ['id'],
} as const;
export type CreateSectionResponseBody = FromSchema<typeof createSectionResponseBodySchema>;

/**
 * Create a new section for the specified project
 * @param request 
 * @param reply 
 */
async function createSection(
    sectionInfo: CreateSectionRequestBody & CreateSectionRequestParams,
    projectsRepo: ProjectsRepository,
): Promise<CreateSectionResponseBody> {
    return await projectsRepo.createSection(sectionInfo.projectId, sectionInfo.name)
}


const sendSectionPromptRequestBodySchema = {
    type: 'object',
    properties: {
        prompt: { type: 'string' }
    },
    required: ['prompt']
} as const;
export type SendSectionPromptRequestBody = FromSchema<typeof sendSectionPromptRequestBodySchema>;

const sendSectionPromptRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' },
        sectionId: { type: 'string' }
    },
    required: ['projectId', 'sectionId']
} as const;
export type SendSectionPromptRequestParams = FromSchema<typeof sendSectionPromptRequestParamsSchema>;

const sendSectionPromptResponseBodySchema = {
    type: 'object',
    properties: {
        output: { type: 'string' }
    },
    required: ['output'],
} as const;
export type SendSectionPromptResponseBody = FromSchema<typeof sendSectionPromptResponseBodySchema>;

/**
 * Send a request to the AI for a specific section
 * @param request 
 * @param reply 
 */
async function sendPrompt(
    sectionInfo: SendSectionPromptRequestBody & SendSectionPromptRequestParams,
    projectsRepo: ProjectsRepository,
): Promise<SendSectionPromptResponseBody> {
    await projectsRepo.addSectionMessage(
        sectionInfo.projectId,
        sectionInfo.sectionId,
        {
            content: sectionInfo.prompt,
            type: 'request'
        }
    )
}


const deleteSectionRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' },
        sectionId: { type: 'string' }
    },
    required: ['projectId', 'sectionId'],
} as const;
export type DeleteSectionRequestParams = FromSchema<typeof deleteSectionRequestParamsSchema>;

/**
 * delete section
 * @param projectId
 * @param projectsRepo
 * @param openAIService
 * @returns true if the project existed, false otherwise
 */
async function deleteSection(
    sectionInfo: DeleteSectionRequestParams,
    projectsRepo: ProjectsRepository
): Promise<void> {
    await projectsRepo.deleteSection(sectionInfo.projectId, sectionInfo.sectionId)
}
