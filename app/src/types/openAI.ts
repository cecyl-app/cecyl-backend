export type VectorStoreId = string
export type OpenAIFileId = string
export type OpenAIResponseId = string

/**
 * Only supported tool is currently file_search
 */
export type OpenAITool = {
    type: 'file_search'
    vectorStoreIds: VectorStoreId[]
}

type OpenAIBasePrompt = {
    userText: string;
    developerText?: string;
    systemText?: string;
    model: string;
}

export type OpenAIPromptForProject = OpenAIBasePrompt

export type OpenAIPromptGeneric = OpenAIBasePrompt & {
    previousResponseId?: string;
    tools?: OpenAITool[];
}