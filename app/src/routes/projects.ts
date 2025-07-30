import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { OpenAIService } from "../third-party/OpenAIService.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectRepo = new ProjectsRepository(fastify.mongo.client)
    const openAIService = new OpenAIService(fastify.openaiClient)

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
            const result = await createProject(projectInfo, projectRepo, openAIService)

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
            const result = await deleteProject(projectId, projectRepo, openAIService)

            if (result)
                reply.status(200).send()
            else
                reply.status(404).send()
        }
    )
}


const createProjectRequestBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' }
    },
    required: ['name', 'context'],
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
    openAIService: OpenAIService
): Promise<CreateProjectResponseBody> {
    const projectVectorStoreId = await openAIService.createVectorStore(projectInfo.name);

    const result = await projectsRepo.createProject({
        ...projectInfo,
        vectorStoreId: projectVectorStoreId
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
): Promise<boolean> {
    const project = await projectsRepo.getProject(projectId, ['vectorStoreId'])
    if (project === null)
        return false

    await projectsRepo.deleteProject(projectId)

    await openAIService.deleteVectorStore(project.vectorStoreId)

    return true
}
