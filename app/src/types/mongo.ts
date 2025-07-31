import { ObjectId } from "@fastify/mongodb";
import { VectorStoreId } from "./openAI.js";

export interface Project {
    name: string;
    context: string;
    vectorStoreId: VectorStoreId;
    lastOpenAIResponseId?: string;
    sections: string[];
}

export interface UserPrompt {
    userText: string;
    developerText?: string;
}

export type AIResponseStatus = 'completed' | 'failed' | 'cancelled' | 'incomplete'

export interface AIResponse {
    id: string;
    createdAt: number;
    status: AIResponseStatus;
    error?: { code: string, message: string }
    incompleteDetails?: { reason: string }
    model: string;
    outputText: string;
}

export interface MessageExchange {
    userPrompt: UserPrompt
    aiResponse: AIResponse
}

export interface Conversation {
    projectId: ObjectId,
    messages: MessageExchange[]
}