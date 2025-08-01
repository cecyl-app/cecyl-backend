import { setTimeout } from 'timers/promises';

import OpenAI, { Uploadable } from "openai";

import { OpenAIFileId, OpenAIPromptForProject, VectorStoreId } from "../types/openAI.js";
import { ProjectsRepository } from '../repositories/ProjectsRepository.js';
import { ConversationsRepository } from '../repositories/ConversationsRepository.js';
import { ProjectNotFound } from '../exceptions/project-exceptions.js';
import { AIResponse } from '../types/mongo.js';


export class OpenAIService {
    protected client: OpenAI
    protected projectsRepo: ProjectsRepository
    protected conversationsRepo: ConversationsRepository

    constructor(
        openAIClient: OpenAI,
        projectsRepo: ProjectsRepository,
        conversationsRepo: ConversationsRepository
    ) {
        this.client = openAIClient
        this.projectsRepo = projectsRepo
        this.conversationsRepo = conversationsRepo
    }


    /**
     * Create a vector store
     * @param name name of the vector store
     * @returns the vector store id
     */
    async createVectorStore(name: string): Promise<VectorStoreId> {
        const vectorStore = await this.client.vectorStores.create({
            name: name
        });

        return vectorStore.id
    }


    async deleteVectorStore(vectorStoreId: VectorStoreId): Promise<void> {
        await this.client.vectorStores.delete(vectorStoreId)
    }


    async uploadFile(file: Uploadable): Promise<OpenAI.Files.FileObject> {
        return await this.client.files.create({
            file: file,
            purpose: "assistants"
        });
    }


    async attachFileToVectorStore(vectorStoreId: VectorStoreId, fileId: OpenAIFileId, waitForStatusCompleted = true): Promise<void> {
        await this.client.vectorStores.files.create(
            vectorStoreId,
            {
                file_id: fileId,
            }
        )

        if (waitForStatusCompleted)
            await this.pollFileStatusForCompleted(fileId, vectorStoreId)
    }


    async listFilesInVectorStore(vectorStoreId: VectorStoreId, limit = 100): Promise<OpenAI.VectorStores.Files.VectorStoreFile[]> {
        // TODO: currently supports 100 files per vector store, if there are more, aggregate from
        // the next pages. See `files.iterPages()`.
        const files = await this.client.vectorStores.files.list(vectorStoreId, { limit: limit });

        return files.data
    }


    async getFileInfo(fileId: OpenAIFileId): Promise<OpenAI.Files.FileObject> {
        const fileInfo = await this.client.files.retrieve(fileId)

        return fileInfo
    }


    async removeFileFromVector(fileId: OpenAIFileId, vectorStoreId: VectorStoreId): Promise<void> {
        await this.client.vectorStores.files.delete(fileId, {
            vector_store_id: vectorStoreId
        });
    }


    async deleteFile(fileId: OpenAIFileId): Promise<void> {
        await this.client.files.delete(fileId);
    }


    /**
     * send a message in the conversation of the specified project. this method automatically
     * updates the previous response id (see convrrsation state at 
     * https://platform.openai.com/docs/guides/conversation-state?api-mode=responses#openai-apis-for-conversation-state )
     * stored in the project info. Moreover it appends the message exchange (input and output messages)
     * in the conversation history
     * @param projectId 
     * @param prompt 
     * @param sharedVectorStoredId the shared vector id, joined with the project-scoped vector id
     * @returns the OpenAI response
     */
    async sendMessage(
        projectId: string,
        prompt: OpenAIPromptForProject,
        sharedVectorStoredId: VectorStoreId
    ): Promise<AIResponse> {
        const project = await this.projectsRepo.getProject(
            projectId, ['vectorStoreId', 'lastOpenAIResponseId']
        )

        if (project === null)
            throw new ProjectNotFound(projectId)

        // ******* tools
        const tools: OpenAI.Responses.Tool[] = [{
            type: 'file_search',
            vector_store_ids: [project.vectorStoreId, sharedVectorStoredId]
        }]

        // ******* input
        const input: OpenAI.Responses.ResponseInput = [{
            role: 'user',
            content: prompt.userText
        }]

        if (prompt.developerText !== undefined)
            input.unshift({
                role: 'developer',
                content: prompt.developerText
            })

        // ******* request
        const response = await this.client.responses.create({
            model: prompt.model,
            previous_response_id: project.lastOpenAIResponseId ?? null,
            tools: tools,
            input: input
        });

        await this.projectsRepo.updateLastOpenAIResponseId(projectId, response.id)

        const result = {
            id: response.id,
            createdAt: response.created_at,
            model: response.model,
            status: response.status || 'incomplete',
            outputText: response.output.filter(o => o.type === 'message')
                .map(m => m.content).flat().map(o => o.type === 'output_text' ? o.text : o.refusal)
                .join('\n'),
            error: response.error ?? undefined,
            incompleteDetails: response.incomplete_details ?? undefined
        }
        await this.conversationsRepo.addMessageExchange(projectId, {
            userPrompt: {
                userText: prompt.userText,
                developerText: prompt.developerText
            },
            aiResponse: result
        })

        return result
    }


    /**
     * The file uploaded to a vector store is not immediately available. It must transit
     * to the `completed` state in order to be used. This function polls every 2.5 seconds
     * if the file is in the `completed` state
     * @param openAIClient OpenAI client
     * @param fileId file id
     * @param vectorStoreId vector store Id
     */
    protected async pollFileStatusForCompleted(fileId: OpenAIFileId, vectorStoreId: VectorStoreId) {
        let vectorStoreFileStatus: OpenAI.VectorStores.Files.VectorStoreFile['status']
        let firstTimePoll = true
        do {
            // after the first time, sleep for 2.5 seconds
            if (!firstTimePoll)
                await setTimeout(2500)

            const vectorStoreFile = await this.client.vectorStores.files.retrieve(
                fileId,
                {
                    vector_store_id: vectorStoreId
                }
            );
            vectorStoreFileStatus = vectorStoreFile.status

            firstTimePoll = false;
        } while (vectorStoreFileStatus !== 'completed');
    }
}