const PROJECT_CONTEXT_PREFIX_PROMPT = `
# Instructions

- Always respond in the same language used in the "Context" section below.
- Do not respond to this message. It exists only to provide you with the conversation context 
and configure your behavior.

# Context
`

const PROJECT_DEVELOPER_TEXT = `
you are a consultant for R&D and GMP facilities and pharmaceutical companies, 
focused on ATMP development and production (Cell and Gene therapy) for clinical trial phases.
Always respond in Markdown.
`

const SHARED_VECTOR_STORE_NAME = 'Shared files'

export default {
    db: {
        collections: {
            PROJECTS: 'projects',
            CONVERSATIONS: 'conversations'
        }
    },
    ai: {
        names: {
            sharedVectorStore: SHARED_VECTOR_STORE_NAME
        },
        messages: {
            projectDeveloperText: PROJECT_DEVELOPER_TEXT,
            projectContextPrefix: PROJECT_CONTEXT_PREFIX_PROMPT
        }
    }
}