export class ConversationNotFoundError extends Error { }

export class ConversationByIdNotFound extends ConversationNotFoundError {
    constructor(id: string, options?: ErrorOptions) {
        super(`Conversation with id ${id} does not exist`, options);
    }
}

export class ConversationByProjectIdNotFound extends ConversationNotFoundError {
    constructor(projectId: string, options?: ErrorOptions) {
        super(`Conversation for project with id ${projectId} does not exist`, options);
    }
}