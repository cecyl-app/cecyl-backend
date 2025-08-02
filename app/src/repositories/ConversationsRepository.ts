import { ObjectId, mongodb } from '@fastify/mongodb'

import { Conversation, MessageExchange } from "../types/mongo.js";
import constants from "../constants.js";
import { ConversationByIdNotFound, ConversationByProjectIdNotFound } from '../exceptions/conversation-errors.js';
import { buildProjectionOption } from '../utils/mongo-utils.js';

const CONVERSATIONS_COLLECTION = constants.db.collections.CONVERSATIONS

type MongoClient = mongodb.MongoClient

export class ConversationsRepository {
    protected conversations: mongodb.Collection<Conversation>

    constructor(mongoClient: MongoClient) {
        const client = mongoClient
        this.conversations = client.db().collection<Conversation>(CONVERSATIONS_COLLECTION)
    }


    async createConversation(projectId: string, projectName: string): Promise<{ id: string }> {
        const conversation = {
            projectId: new ObjectId(projectId),
            projectName: projectName,
            messages: []
        }
        const result = await this.conversations.insertOne(conversation)

        return { id: result.insertedId.toString() }
    }


    async getConversationByProjectId(projectId: string): Promise<Conversation | null> {
        const conversation = await this.conversations.findOne({ projectId: new ObjectId(projectId) })

        return conversation
    }


    async listConversations(): Promise<{ id: string, projectId: string, projectName: string }[]> {
        const allConversationsCursor = this.conversations.find(
            {},
            buildProjectionOption<Conversation>('_id', 'projectId', 'projectName')
        )

        const result: { id: string, projectId: string, projectName: string }[] = []
        for await (const conversation of allConversationsCursor) {
            result.push({
                id: conversation._id.toString(),
                projectId: conversation.projectId.toString(),
                projectName: conversation.projectName
            })
        }

        return result
    }


    /**
     * add a request-response exchange to the project conversation
     * @param projectId 
     * @param messageExchange 
     * @returns true if a document has been found and modified, false otherwise
     */
    async addMessageExchangeToProject(projectId: string, messageExchange: MessageExchange): Promise<void> {
        const result = await this.conversations.updateOne(
            { projectId: new ObjectId(projectId) },
            {
                "$push": {
                    messages: messageExchange
                }
            }
        )

        if (result.matchedCount === 0)
            throw new ConversationByProjectIdNotFound(projectId)
    }


    /**
     * Delete the conversation of a project
     * @param projectId 
     * @returns true if the conversation existed (and is deleted), false otherwise
     */
    async deleteConversation(id: string): Promise<void> {
        const result = await this.conversations.deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0)
            throw new ConversationByIdNotFound(id)
    }
}