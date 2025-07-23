import { FastifyInstance, FastifyRegisterOptions, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import constants from "../constants.js";
import { Project } from "../types/mongo.js";
import { projectFields } from "../utils/mongo-utils.js";

const PROJECTS_COLLECTION = constants.db.collections.PROJECTS

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
    request: FastifyRequest<{ Body: CreateProjectRequestBody }>,
    reply: FastifyReply<{ Reply: CreateProjectResponseBody }>
): Promise<void> {
    const openaiClient = request.server.openaiClient
    const projectInfo = request.body
    const mongo = request.server.mongo

    const projectVectorStore = await openaiClient.vectorStores.create({
        name: projectInfo.name
    });

    const projects = mongo.db.collection<Project>(PROJECTS_COLLECTION)

    const project = {
        ...projectInfo,
        vectorStore: projectVectorStore.id,
        sections: []
    }

    const result = await projects.insertOne(project)

    reply.status(201).send({ id: result.insertedId.toString() })
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
 * @param request 
 * @param reply 
 */
async function listProjects(
    request: FastifyRequest,
    reply: FastifyReply<{ Reply: ListProjectsResponseBody }>
): Promise<void> {
    const mongo = request.server.mongo

    const projects = mongo.db.collection<Project>(PROJECTS_COLLECTION)

    const allProjectsCursor = projects.find({}, projectFields<Project>('_id', 'name'))

    let result: { id: string, name: string }[] = []
    for await (const project of allProjectsCursor) {
        result.push({
            id: project._id.toString(),
            name: project.name
        })
    }

    reply.status(200).send(result)
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
 * @param request 
 * @param reply 
 */
async function getProject(
    request: FastifyRequest<{ Params: GetProjectRequestParams }>,
    reply: FastifyReply<{ Reply: GetProjectResponseBody }>
): Promise<void> {
    const projectId = request.params.projectId
    const mongo = request.server.mongo

    const projects = mongo.db.collection<Project>(PROJECTS_COLLECTION)

    const project = await projects.findOne(
        { _id: new mongo.ObjectId(projectId) },
        projectFields<Project>('name', 'context', 'sections')
    )

    const result = {
        name: project.name,
        context: project.context,
        sections: project.sections
    }

    reply.status(200).send(result)
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
 * @param request 
 * @param reply 
 */
async function deleteProject(
    request: FastifyRequest<{ Params: DeleteProjectRequestParams }>,
    reply: FastifyReply
): Promise<void> {
    const openaiClient = request.server.openaiClient
    const projectId = request.params.projectId
    const mongo = request.server.mongo
    const projectFilter = { _id: new mongo.ObjectId(projectId) }

    const projects = mongo.db.collection<Project>(PROJECTS_COLLECTION);
    const vectorStore = (await projects.findOne(projectFilter, projectFields<Project>('vectorStore'))).vectorStore

    await projects.deleteOne(projectFilter)

    await openaiClient.vectorStores.del(vectorStore)

    reply.status(200).send()
}

export default async function routes(fastify: FastifyInstance, options: FastifyServerOptions) {
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
        createProject
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
        listProjects
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
        getProject
    )

    fastify.delete<{ Params: DeleteProjectRequestParams }>(
        '/projects/:projectId',
        {
            schema: {
                params: deleteProjectRequestParamsSchema
            }
        },
        deleteProject
    )
}