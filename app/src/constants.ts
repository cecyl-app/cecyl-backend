const PROJECT_CONTEXT_PROMPT = `
# Instructions

- Always respond in the same language used in the "Context" section below.
- Do not respond to this message. It exists only to provide you with the conversation context 
and configure your behavior.

# Context
`

const PROJECT_DEVELOPER_TEXT = `
you are a consultant for R&D and GMP facilities and pharmaceutical companies, 
focused on ATMP development and production (Cell and Gene therapy) for clinical trial phases.
`


export default {
    db: {
        collections: {
            PROJECTS: 'projects',
            CONVERSATIONS: 'conversations'
        }
    },
    ai: {
        messages: {
            projectDeveloperText: PROJECT_DEVELOPER_TEXT,
            projectContext: PROJECT_CONTEXT_PROMPT
        }
    }
}