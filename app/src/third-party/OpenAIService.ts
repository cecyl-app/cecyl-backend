import { setTimeout } from 'timers/promises';

import OpenAI, { Uploadable } from "openai";

import { OpenAIFileId, VectorStoreId } from "../types/openAI.js";

export class OpenAIService {
    client: OpenAI

    constructor(openAIClient: OpenAI) {
        this.client = openAIClient
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