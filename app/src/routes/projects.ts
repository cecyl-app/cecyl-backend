import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { OpenAIService } from "../services/OpenAIService.js";
import { ConversationsRepository } from "../repositories/ConversationsRepository.js";
import constants from "../constants.js";
import { ProjectNotFound } from "../exceptions/project-errors.js";
import { ConversationNotFoundError } from "../exceptions/conversation-errors.js";
import { OpenAIResponseError } from "../exceptions/openai-error.js";
import ProjectEntity from "../entities/ProjectEntity.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectsRepo = fastify.projectsRepo
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
            const result = await createProject(projectInfo, projectsRepo, conversationsRepo, openAIService)

            reply.status(201).send(result)
        }
    )

    fastify.put<{ Body: UpdateProjectRequestBody, Params: UpdateProjectRequestParams }>(
        '/projects/:projectId',
        {
            schema: {
                params: updateProjectRequestParamsSchema,
                body: updateProjectRequestBodySchema
            }
        },
        async (request, reply) => {
            const updateProjectInfo = request.body
            await updateProject(request.params.projectId, updateProjectInfo, projectsRepo, openAIService)

            reply.status(200).send()
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
            const result = await listProjects(projectsRepo)

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
            const result = await getProject(projectId, projectsRepo)

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
            await deleteProject(projectId, projectsRepo, openAIService)

            reply.status(200).send()
        }
    )

    fastify.setErrorHandler(function (error, request, reply) {
        fastify.log.error(error)

        if ([ProjectNotFound, ConversationNotFoundError].some(etype => error instanceof etype))
            reply.status(404).send({ message: error.message })

        if (error instanceof OpenAIResponseError)
            reply.status(500).send({ message: error.message })
    })
}


const createProjectRequestBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' },
        language: { type: 'string' }
    },
    required: ['name', 'context', 'language']
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
 * @param projectInfo 
 * @param projectsRepo 
 * @param conversationsRepo 
 * @param openAIService 
 * @returns 
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
        userText: constants.ai.messages.projectContextPrefix(projectInfo.language) + projectInfo.context,
        systemText: constants.ai.messages.projectSystemText
    })

    return result
}


const updateProjectRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId'],
} as const;
export type UpdateProjectRequestParams = FromSchema<typeof updateProjectRequestParamsSchema>;

const updateProjectRequestBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' },
        sectionIdsOrder: {
            type: 'array',
            items: {
                type: 'string',
            }
        },
        language: { type: 'string' }
    },
    required: ['name', 'context', 'sectionIdsOrder', 'language']
} as const;
export type UpdateProjectRequestBody = FromSchema<typeof updateProjectRequestBodySchema>;

/**
 * update a project info (not the sections)
 * @param projectUpdateInfo 
 * @param projectsRepo 
 * @param openAIService 
 * @returns 
 */
async function updateProject(
    projectId: string,
    projectUpdateInfo: UpdateProjectRequestBody,
    projectsRepo: ProjectsRepository,
    openAIService: OpenAIService
): Promise<void> {
    const project = await projectsRepo.getProject(projectId, ['context'])
    if (project == null)
        throw new ProjectNotFound(projectId)

    await projectsRepo.updateProjectInfo(projectId, projectUpdateInfo)

    if (project.context !== projectUpdateInfo.context) {
        await openAIService.sendMessage(projectId, {
            model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
            userText: constants.ai.messages.projectContextPrefix(projectUpdateInfo.language) + projectUpdateInfo.context
        })
    }
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
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    history: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                content: { type: 'string' },
                                type: {
                                    enum: ['request', 'response', 'improve']
                                }
                            },
                            required: ['content', 'type']
                        }
                    }
                },
                required: ['id', 'name', 'history']
            }
        }
    },
    required: ['name', 'context', 'sections'],
} as const;
export type GetProjectResponseBody = FromSchema<typeof getProjectResponseBodySchema>;

/**
 * Get the project info, with sections ordered using sectionIdsOrder
 * @param projectId
 * @param projectsRepo
 * @returns the project info
 */
async function getProject(
    projectId: string,
    projectsRepo: ProjectsRepository,
): Promise<GetProjectResponseBody | null> {
    const project = await projectsRepo.getProject(projectId, ['name', 'context', 'sections', 'sectionIdsOrder'])

    if (project === null)
        return null

    const projectEntity = new ProjectEntity(projectId, project)

    const result = {
        name: projectEntity.name,
        context: projectEntity.context,
        sections: projectEntity.sections.map(s => ({
            id: s.id.toString(),
            name: s.name,
            history: s.history
        }))
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
 * delete a project and its associated vector store
 * @param projectId
 * @param projectsRepo
 * @param openAIService
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
