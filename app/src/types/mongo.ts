import { ObjectId } from "@fastify/mongodb";
import { OpenAIResponseId, VectorStoreId } from "./openAI.js";
import OpenAI from "openai";

export interface Project {
    name: string;
    context: string;
    vectorStoreId: VectorStoreId;
    lastOpenAIResponseId?: OpenAIResponseId;
    sections: string[];
}

export interface UserPrompt {
    userText: string;
    developerText?: string;
}

export interface AIResponse {
    id: string;
    createdAt: number;
    status: OpenAI.Responses.ResponseStatus;
    error?: OpenAI.Responses.ResponseError;
    incompleteDetails?: OpenAI.Responses.Response.IncompleteDetails;
    model: string;
    outputText: string;
}

export interface MessageExchange {
    userPrompt: UserPrompt
    aiResponse: AIResponse
}

export interface Conversation {
    projectId: ObjectId;
    projectName: string;
    messages: MessageExchange[]
}