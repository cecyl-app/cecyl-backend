import OpenAI from "openai"

declare module 'fastify' {
    interface FastifyInstance {
        openaiClient: OpenAI
        sharedVectorStoreId: string
    }
}