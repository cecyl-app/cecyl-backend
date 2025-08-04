import { ConversationsRepository } from "../../src/repositories/ConversationsRepository";

export class ConversationsTestUtils {
    static async deleteAllConversations(conversationsRepo: ConversationsRepository): Promise<void> {
        const conversations = await conversationsRepo.listConversations()

        await Promise.all(conversations.map(c => conversationsRepo.deleteConversation(c.id)))
    }
}