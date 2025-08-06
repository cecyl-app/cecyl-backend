import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { OpenAIService } from "../third-party/OpenAIService.js";
import constants from "../constants.js";
import { ProjectNotFound, ProjectSectionNotFound } from "../exceptions/project-errors.js";
import { ConversationNotFoundError } from "../exceptions/conversation-errors.js";
import { OpenAIResponseError } from "../exceptions/openai-error.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectsRepo = fastify.projectsRepo
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

    fastify.post<{ Body: SendSectionPromptRequestBody, Params: SendSectionPromptRequestParams, Reply: SendSectionPromptResponseBody }>(
        '/projects/:projectId/sections/:sectionId/ask',
        {
            schema: {
                body: sendSectionPromptRequestBodySchema,
                params: sendSectionPromptRequestParamsSchema,
                response: {
                    200: sendSectionPromptResponseBodySchema
                }
            }
        },
        async (request, reply) => {
            const promptInfo = {
                projectId: request.params.projectId,
                sectionId: request.params.sectionId,
                prompt: request.body.prompt
            }
            const result = await sendPrompt(promptInfo, projectsRepo, openAIService)

            reply.status(200).send(result)
        }
    )

    fastify.post<{ Body: SendSectionImproveRequestBody, Params: SendSectionImproveRequestParams }>(
        '/projects/:projectId/sections/:sectionId/improve',
        {
            schema: {
                body: sendSectionImproveRequestBodySchema,
                params: sendSectionImproveRequestParamsSchema
            }
        },
        async (request, reply) => {
            const improveInfo = {
                projectId: request.params.projectId,
                sectionId: request.params.sectionId,
                prompt: request.body.prompt
            }
            await sendImprove(improveInfo, projectsRepo, openAIService)

            reply.status(200).send()
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

        if ([ProjectNotFound, ConversationNotFoundError, ProjectSectionNotFound].some(etype => error instanceof etype))
            reply.status(404).send({ message: error.message })

        if (error instanceof OpenAIResponseError)
            reply.status(500).send({ message: error.message })
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
 * @param sectionInfo 
 * @param projectsRepo 
 * @returns the section id
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
 * @param promptInfo 
 * @param projectsRepo 
 * @returns the AI text response
 */
async function sendPrompt(
    promptInfo: SendSectionPromptRequestBody & SendSectionPromptRequestParams,
    projectsRepo: ProjectsRepository,
    openAIService: OpenAIService
): Promise<SendSectionPromptResponseBody> {
    const response = await openAIService.sendMessage(
        promptInfo.projectId,
        {
            model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
            userText: constants.ai.messages.sectionPromptPrefix(promptInfo.sectionId) + promptInfo.prompt
        }
    )

    await projectsRepo.addSectionMessage(
        promptInfo.projectId,
        promptInfo.sectionId,
        {
            content: promptInfo.prompt,
            type: 'request'
        }
    )

    await projectsRepo.addSectionMessage(
        promptInfo.projectId,
        promptInfo.sectionId,
        {
            content: response.outputText,
            type: 'response'
        }
    )

    return {
        output: response.outputText
    }
}


const sendSectionImproveRequestBodySchema = {
    type: 'object',
    properties: {
        prompt: { type: 'string' }
    },
    required: ['prompt']
} as const;
export type SendSectionImproveRequestBody = FromSchema<typeof sendSectionImproveRequestBodySchema>;

const sendSectionImproveRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' },
        sectionId: { type: 'string' }
    },
    required: ['projectId', 'sectionId']
} as const;
export type SendSectionImproveRequestParams = FromSchema<typeof sendSectionImproveRequestParamsSchema>;

/**
 * Send to the AI an improve to a previous response for a specific section
 * @param improveInfo 
 * @param projectsRepo 
 */
async function sendImprove(
    improveInfo: SendSectionImproveRequestBody & SendSectionImproveRequestParams,
    projectsRepo: ProjectsRepository,
    openAIService: OpenAIService
): Promise<void> {
    await openAIService.sendMessage(
        improveInfo.projectId,
        {
            model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
            userText: constants.ai.messages.sectionImprovePrefix(improveInfo.sectionId) + improveInfo.prompt
        }
    )

    await projectsRepo.addSectionMessage(
        improveInfo.projectId,
        improveInfo.sectionId,
        {
            content: improveInfo.prompt,
            type: 'improve'
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
 */
async function deleteSection(
    sectionInfo: DeleteSectionRequestParams,
    projectsRepo: ProjectsRepository
): Promise<void> {
    await projectsRepo.deleteSection(sectionInfo.projectId, sectionInfo.sectionId)
}
