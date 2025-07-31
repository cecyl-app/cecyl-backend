import { ObjectId, mongodb } from '@fastify/mongodb'

import { Project } from "../types/mongo.js";
import constants from "../constants.js";
import { buildProjectionOption } from '../utils/mongo-utils.js';

const PROJECTS_COLLECTION = constants.db.collections.PROJECTS

type MongoClient = mongodb.MongoClient

type ProjectFields = Parameters<typeof buildProjectionOption<Project>>[0]

type ProjectInfo = Pick<Project, 'name' | 'context' | 'vectorStoreId'>

export class ProjectsRepository {
    protected projects: mongodb.Collection<Project>

    constructor(mongoClient: MongoClient) {
        const client = mongoClient
        this.projects = client.db().collection<Project>(PROJECTS_COLLECTION)
    }

    async createProject(projectInfo: ProjectInfo): Promise<{ id: string }> {
        const project = {
            ...projectInfo,
            lastOpenAIResponseId: undefined,
            sections: []
        }
        const result = await this.projects.insertOne(project)

        return { id: result.insertedId.toString() }
    }

    async listProjects(): Promise<{ id: string, name: string }[]> {
        const allProjectsCursor = this.projects.find(
            {},
            buildProjectionOption<Project>('_id', 'name')
        )

        const result: { id: string, name: string }[] = []
        for await (const project of allProjectsCursor) {
            result.push({
                id: project._id.toString(),
                name: project.name
            })
        }

        return result
    }

    async getProject(id: string, projectionFields: ProjectFields[]): Promise<Project | null> {
        const project = await this.projects.findOne(
            { _id: new ObjectId(id) },
            buildProjectionOption<Project>(...projectionFields)
        )

        return project
    }

    async deleteProject(id: string): Promise<boolean> {
        const result = await this.projects.deleteOne({ _id: new ObjectId(id) })

        return result.deletedCount === 1
    }
}