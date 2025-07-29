export interface Project {
    name: string;
    context: string;
    vectorStore: string;
    lastOpenAIResponseId: string;
    sections: any[];
}