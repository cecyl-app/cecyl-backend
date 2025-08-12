import { ObjectId } from "@fastify/mongodb";
import { OpenAIResponseId, VectorStoreId } from "./openAI.js";
import OpenAI from "openai";

export type SectionHistoryMessage = {
    content: string;
    type: 'request' | 'response' | 'improve'
}

export type ProjectSection = {
    id: ObjectId;
    name: string;
    history: SectionHistoryMessage[];
}

export type Project = {
    name: string;
    context: string;
    vectorStoreId: VectorStoreId;
    lastOpenAIResponseId?: OpenAIResponseId;
    sections: ProjectSection[];
    sectionIdsOrder: ObjectId[];
}

export type UserPrompt = {
    userText: string;
    developerText?: string;
}

export type AIResponse = {
    id: string;
    createdAt: number;
    status: OpenAI.Responses.ResponseStatus;
    error?: OpenAI.Responses.ResponseError;
    incompleteDetails?: OpenAI.Responses.Response.IncompleteDetails;
    model: string;
    outputText: string;
}

export type MessageExchange = {
    userPrompt: UserPrompt
    aiResponse: AIResponse
}

export type Conversation = {
    projectId: ObjectId;
    projectName: string;
    messages: MessageExchange[]
}