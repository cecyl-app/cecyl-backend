import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { OpenAIService } from "../third-party/OpenAIService.js";
import { ConversationsRepository } from "../repositories/ConversationsRepository.js";
import constants from "../constants.js";
import { ProjectNotFound } from "../exceptions/project-errors.js";
import { ConversationNotFoundError } from "../exceptions/conversation-errors.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectRepo = fastify.projectsRepo
    const conversationsRepo = fastify.conversationsRepo
    const openAIService = fastify.openAIService

    fastify.post<{ Body: CreateProjectRequestBody, Reply: CreateProjectResponseBody }>(
        '/projects',
        {
            schema: {
                body: createProjectRequestBodySchema,
                response: {
                    201: createProjectResponseBodySchema,
                },
            }
        },
        async (request, reply) => {
            const projectInfo = request.body
            const result = await createProject(projectInfo, projectRepo, conversationsRepo, openAIService)

            reply.status(201).send(result)
        }
    )

    fastify.get<{ Reply: ListProjectsResponseBody }>(
        '/projects',
        {
            schema: {
                response: {
                    200: listProjectsResponseBodySchema,
                }
            }
        },
        async (request, reply) => {
            const result = await listProjects(projectRepo)

            reply.status(200).send(result)
        }
    )

    fastify.get<{ Params: GetProjectRequestParams, Reply: GetProjectResponseBody }>(
        '/projects/:projectId',
        {
            schema: {
                params: getProjectRequestParamsSchema,
                response: {
                    200: getProjectResponseBodySchema,
                },
            }
        },
        async (request, reply) => {
            const projectId = request.params.projectId
            const result = await getProject(projectId, projectRepo)

            if (result === null)
                reply.status(404).send()
            else
                reply.status(200).send(result)
        }
    )

    fastify.delete<{ Params: DeleteProjectRequestParams }>(
        '/projects/:projectId',
        {
            schema: {
                params: deleteProjectRequestParamsSchema
            }
        },
        async (request, reply) => {
            const projectId = request.params.projectId
            await deleteProject(projectId, projectRepo, openAIService)

            reply.status(200).send()
        }
    )

    fastify.setErrorHandler(function (error, request, reply) {
        fastify.log.error(error)

        if ([ProjectNotFound, ConversationNotFoundError].some(etype => error instanceof etype))
            reply.status(404).send({ message: error.message })
    })
}


const createProjectRequestBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' }
    },
    required: ['name', 'context']
} as const;
export type CreateProjectRequestBody = FromSchema<typeof createProjectRequestBodySchema>;

const createProjectResponseBodySchema = {
    type: 'object',
    properties: {
        id: { type: 'string' }
    },
    required: ['id'],
} as const;
export type CreateProjectResponseBody = FromSchema<typeof createProjectResponseBodySchema>;

/**
 * Create a new project with no section. a dedicated vector store is automatically created
 * @param request 
 * @param reply 
 */
async function createProject(
    projectInfo: CreateProjectRequestBody,
    projectsRepo: ProjectsRepository,
    conversationsRepo: ConversationsRepository,
    openAIService: OpenAIService
): Promise<CreateProjectResponseBody> {
    const projectVectorStoreId = await openAIService.createVectorStore(projectInfo.name);

    const result = await projectsRepo.createProject({
        ...projectInfo,
        vectorStoreId: projectVectorStoreId
    })

    await conversationsRepo.createConversation(result.id, projectInfo.name)
    await openAIService.sendMessage(result.id, {
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        userText: constants.ai.messages.projectContextPrefix + projectInfo.context,
        developerText: constants.ai.messages.projectDeveloperText
    })

    return result
}


const listProjectsResponseBodySchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' }
        },
        required: ['id', 'name']
    }
} as const;
export type ListProjectsResponseBody = FromSchema<typeof listProjectsResponseBodySchema>;

/**
 * List all the projects
 * @param projectsRepo
 * @returns the list of projects
 */
async function listProjects(
    projectsRepo: ProjectsRepository
): Promise<ListProjectsResponseBody> {
    return await projectsRepo.listProjects()
}


const getProjectRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId'],
} as const;
export type GetProjectRequestParams = FromSchema<typeof getProjectRequestParamsSchema>;

const getProjectResponseBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' },
        sections: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    },
    required: ['name', 'context', 'sections'],
} as const;
export type GetProjectResponseBody = FromSchema<typeof getProjectResponseBodySchema>;

/**
 * Get the project info
 * @param projectId
 * @param projectsRepo
 * @returns the project info
 */
async function getProject(
    projectId: string,
    projectsRepo: ProjectsRepository,
): Promise<GetProjectResponseBody | null> {
    const project = await projectsRepo.getProject(projectId, ['name', 'context', 'sections'])

    if (project === null)
        return null

    const result = {
        name: project.name,
        context: project.context,
        sections: project.sections
    }

    return result
}


const deleteProjectRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId'],
} as const;
export type DeleteProjectRequestParams = FromSchema<typeof deleteProjectRequestParamsSchema>;

/**
 * Create a new project with no section. a dedicated vector store is automatically created
 * @param projectId
 * @param projectsRepo
 * @param openAIService
 * @returns true if the project existed, false otherwise
 */
async function deleteProject(
    projectId: string,
    projectsRepo: ProjectsRepository,
    openAIService: OpenAIService
): Promise<void> {
    const project = await projectsRepo.getProject(projectId, ['vectorStoreId'])
    if (project === null)
        throw new ProjectNotFound(projectId)

    await projectsRepo.deleteProject(projectId)

    await openAIService.deleteVectorStore(project.vectorStoreId)
}
