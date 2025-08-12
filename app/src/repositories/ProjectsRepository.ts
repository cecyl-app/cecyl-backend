import { ObjectId, mongodb } from '@fastify/mongodb'

import { Project, SectionHistoryMessage } from "../types/mongo.js";
import constants from "../constants.js";
import { buildProjectionOption } from '../utils/mongo-utils.js';
import { OpenAIResponseId } from '../types/openAI.js';
import { ProjectNotFound, ProjectSectionNotFound } from '../exceptions/project-errors.js';

const PROJECTS_COLLECTION = constants.db.collections.PROJECTS

type MongoClient = mongodb.MongoClient

type ProjectFields = Parameters<typeof buildProjectionOption<Project>>[0]

type ProjectInfo = Pick<Project, 'name' | 'context' | 'vectorStoreId'>
type ProjectUpdateInfo = Pick<Project, 'name' | 'context'> & { sectionIdsOrder: string[] }


export class ProjectsRepository {
    protected projects: mongodb.Collection<Project>


    constructor(mongoClient: MongoClient) {
        const client = mongoClient
        this.projects = client.db().collection<Project>(PROJECTS_COLLECTION)
    }


    async createProject(projectInfo: ProjectInfo): Promise<{ id: string }> {
        const project: Project = {
            ...projectInfo,
            lastOpenAIResponseId: undefined,
            sections: [],
            sectionIdsOrder: []
        }
        const result = await this.projects.insertOne(project)

        return { id: result.insertedId.toString() }
    }


    async updateProjectInfo(id: string, projectUpdateInfo: ProjectUpdateInfo): Promise<void> {
        const result = await this.projects.updateOne(
            { _id: new ObjectId(id) },
            {
                '$set': {
                    name: projectUpdateInfo.name,
                    context: projectUpdateInfo.context,
                    sectionIdsOrder: projectUpdateInfo.sectionIdsOrder.map(sid => new ObjectId(sid))
                }
            }
        )

        if (result.matchedCount !== 1)
            throw new ProjectNotFound(id)
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


    async updateLastOpenAIResponseId(id: string, lastOpenAIResponseId: OpenAIResponseId): Promise<void> {
        const result = await this.projects.updateOne(
            { _id: new ObjectId(id) },
            {
                '$set': {
                    lastOpenAIResponseId: lastOpenAIResponseId
                }
            }
        )

        if (result.matchedCount === 0)
            throw new ProjectNotFound(id)
    }


    async deleteProject(id: string): Promise<void> {
        const result = await this.projects.deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0)
            throw new ProjectNotFound(id)
    }


    // ****************************************************
    // ********************* SECTIONS *********************
    // ****************************************************
    async createSection(projectId: string, name: string): Promise<{ id: string }> {
        const sectionId = new ObjectId()

        const result = await this.projects.updateOne(
            { _id: new ObjectId(projectId) },
            {
                "$push": {
                    sections: {
                        id: sectionId,
                        name: name,
                        history: []
                    },
                    sectionIdsOrder: sectionId
                }
            }
        )

        if (result.matchedCount !== 1 || result.modifiedCount !== 1)
            throw new ProjectNotFound(projectId)

        return { id: sectionId.toString() }
    }


    async addSectionMessage(
        projectId: string, sectionId: string, messageInfo: SectionHistoryMessage
    ): Promise<void> {
        const result = await this.projects.updateOne(
            {
                _id: new ObjectId(projectId)
            },
            {
                "$push": {
                    "sections.$[elem].history": {
                        content: messageInfo.content,
                        type: messageInfo.type
                    }
                }
            },
            {
                "arrayFilters": [
                    {
                        "elem.id": { $eq: new ObjectId(sectionId) }
                    }
                ]
            }
        )

        if (result.matchedCount !== 1)
            throw new ProjectNotFound(projectId)

        if (result.modifiedCount !== 1)
            throw new ProjectSectionNotFound(projectId, sectionId)
    }


    async deleteSection(projectId: string, sectionId: string): Promise<void> {
        const sectionObjectId = new ObjectId(sectionId)

        const result = await this.projects.updateOne(
            { _id: new ObjectId(projectId) },
            {
                "$pull": {
                    sections: {
                        id: sectionObjectId
                    },
                    sectionIdsOrder: sectionObjectId
                }
            }
        )

        if (result.matchedCount !== 1 || result.modifiedCount !== 1)
            throw new ProjectNotFound(projectId)
    }
}