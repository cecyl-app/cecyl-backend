import { setTimeout } from 'timers/promises';

import OpenAI, { Uploadable } from "openai";

import { OpenAIFileId, OpenAIPromptForProject, VectorStoreId } from "../types/openAI.js";
import { ProjectsRepository } from '../repositories/ProjectsRepository.js';
import { ConversationsRepository } from '../repositories/ConversationsRepository.js';
import { ProjectNotFound } from '../exceptions/project-errors.js';
import { AIResponse } from '../types/mongo.js';
import constants from '../constants.js';
import { OpenAIResponseError } from '../exceptions/openai-error.js';


export class OpenAIService {
    protected client: OpenAI
    protected projectsRepo: ProjectsRepository
    protected conversationsRepo: ConversationsRepository
    protected _sharedVectorStoreId: VectorStoreId


    private constructor(openAIClient: OpenAI,
        projectsRepo: ProjectsRepository,
        conversationsRepo: ConversationsRepository
    ) {
        this.client = openAIClient
        this.projectsRepo = projectsRepo
        this.conversationsRepo = conversationsRepo
    }


    static async create(openAIClient: OpenAI,
        projectsRepo: ProjectsRepository,
        conversationsRepo: ConversationsRepository
    ): Promise<OpenAIService> {
        const service = new OpenAIService(openAIClient, projectsRepo, conversationsRepo)

        service._sharedVectorStoreId = await service.createSharedVectorStoreIfNotExists()

        return service
    }


    get sharedVectorStoreId(): VectorStoreId {
        return this._sharedVectorStoreId
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
     * updates the previous response id (see conversation state at 
     * https://platform.openai.com/docs/guides/conversation-state?api-mode=responses#openai-apis-for-conversation-state )
     * stored in the project info. Moreover it appends the message exchange (input and output messages)
     * in the conversation history
     * @param projectId 
     * @param prompt
     * @returns the OpenAI response
     */
    async sendMessage(
        projectId: string,
        prompt: OpenAIPromptForProject
    ): Promise<AIResponse> {
        const project = await this.projectsRepo.getProject(
            projectId, ['vectorStoreId', 'lastOpenAIResponseId']
        )

        if (project === null)
            throw new ProjectNotFound(projectId)

        // ******* tools
        const tools: OpenAI.Responses.Tool[] = [{
            type: 'file_search',
            vector_store_ids: [project.vectorStoreId, this._sharedVectorStoreId]
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

        if (prompt.systemText !== undefined)
            input.unshift({
                role: 'system',
                content: prompt.systemText
            })

        // ******* request
        const response = await this.client.responses.create({
            model: prompt.model,
            previous_response_id: project.lastOpenAIResponseId ?? null,
            tools: tools,
            input: input
        });

        await this.projectsRepo.updateLastOpenAIResponseId(projectId, response.id)

        const responseStatus = response.status ?? 'incomplete'
        const result = {
            id: response.id,
            createdAt: response.created_at,
            model: response.model,
            status: responseStatus,
            outputText: response.output.filter(o => o.type === 'message')
                .map(m => m.content).flat().map(o => o.type === 'output_text' ? o.text : o.refusal)
                .join('\n'),
            error: response.error ?? undefined,
            incompleteDetails: response.incomplete_details ?? undefined
        }
        await this.conversationsRepo.addMessageExchangeToProject(projectId, {
            userPrompt: {
                userText: prompt.userText,
                developerText: prompt.developerText
            },
            aiResponse: result
        })

        if (response.error !== null)
            throw new OpenAIResponseError(response.id, response.error, responseStatus, result.incompleteDetails)

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

    /**
     * Create the vector store containing files necessary for all projects. The store is 
     * created only if it does not exist yet
     * @returns the vector store id
     */
    protected async createSharedVectorStoreIfNotExists(): Promise<VectorStoreId> {
        // get only the first 10 vector stores created, the shared one is assumed to be among them
        const vectorStores = await this.client.vectorStores.list({ limit: 10, order: "asc" });

        let sharedVectorStore = vectorStores.data.find(vs => vs.name === constants.ai.names.sharedVectorStore);

        // Create new vector store if shared one does not exist
        sharedVectorStore ??= await this.client.vectorStores.create({
            name: constants.ai.names.sharedVectorStore
        });

        return sharedVectorStore.id
    }
}