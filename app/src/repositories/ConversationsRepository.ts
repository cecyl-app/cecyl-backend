import { ObjectId, mongodb } from '@fastify/mongodb'

import { Conversation, MessageExchange } from "../types/mongo.js";
import constants from "../constants.js";

const CONVERSATIONS_COLLECTION = constants.db.collections.CONVERSATIONS

type MongoClient = mongodb.MongoClient

export class ConversationsRepository {
    protected conversations: mongodb.Collection<Conversation>

    constructor(mongoClient: MongoClient) {
        const client = mongoClient
        this.conversations = client.db().collection<Conversation>(CONVERSATIONS_COLLECTION)
    }


    async createConversation(projectId: string): Promise<{ id: string }> {
        const conversation = {
            projectId: new ObjectId(projectId),
            messages: []
        }
        const result = await this.conversations.insertOne(conversation)

        return { id: result.insertedId.toString() }
    }


    async getConversation(projectId: string): Promise<Conversation | null> {
        const conversation = await this.conversations.findOne({ projectId: new ObjectId(projectId) })

        return conversation
    }


    /**
     * add a request-response exchange to the project conversation
     * @param projectId 
     * @param messageExchange 
     * @returns true if a document has been found and modified, false otherwise
     */
    async addMessageExchange(projectId: string, messageExchange: MessageExchange): Promise<boolean> {
        const result = await this.conversations.updateOne(
            { projectId: new ObjectId(projectId) },
            {
                "$push": {
                    messages: messageExchange
                }
            }
        )

        return result.matchedCount === 1 && result.modifiedCount === 1
    }


    /**
     * Delete the conversation of a project
     * @param projectId 
     * @returns true if the conversation existed (and is deleted), false otherwise
     */
    async deleteConversation(projectId: string): Promise<boolean> {
        const result = await this.conversations.deleteOne({ projectId: new ObjectId(projectId) })

        return result.deletedCount === 1
    }
}