export type VectorStoreId = string
export type OpenAIFileId = string

/**
 * Only supported tool is currently file_search
 */
export type OpenAITool = {
    type: 'file_search'
    vectorStoreIds: string[]
}


export type OpenAIUserPrompt = {
    userText: string;
    developerText?: string;
    model: string;
    tools?: OpenAITool[];
    previousResponseId?: string;
}