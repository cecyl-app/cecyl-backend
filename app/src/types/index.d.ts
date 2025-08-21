import { OpenAIService } from "../services/OpenAIService.ts"
import { ProjectsRepository } from "../repositories/ProjectsRepository.ts"
import { ConversationsRepository } from "../repositories/ConversationsRepository.ts"

declare module 'fastify' {
    interface FastifyInstance {
        projectsRepo: ProjectsRepository
        conversationsRepo: ConversationsRepository
        openAIService: OpenAIService
    }
}