import { VectorStoreId } from "./openAI.js";

export interface Project {
    name: string;
    context: string;
    vectorStoreId: VectorStoreId;
    lastOpenAIResponseId?: string;
    sections: string[];
}