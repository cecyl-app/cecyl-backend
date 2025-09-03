import { str, envsafe, makeValidator } from 'envsafe';
import { InvalidInput } from './exceptions/generic-error.js';

const commaSeparatedEmailsParser = makeValidator<string[]>((input: string) => {
    const emails = input.split(",").map(s => s.trim());
    if (!emails.every(e => /^[^@]+@[^@]+\.[^@]+$/.test(e)))
        throw new InvalidInput("comma-separated list of emails", input);

    return emails;
})

export const env = envsafe({
    NODE_ENV: str({
        choices: ['test', 'production'],
    }),
    DB_CONN_STRING: str({
        desc: 'The connection string for the DB',
        example: 'mongodb://mongouser:password@db:27017/cecyldb?authSource=admin'
    }),
    GOOGLE_AUTH_CLIENT_ID: str({
        desc: 'The client ID of the Google Auth. See https://console.cloud.google.com/auth/clients',
    }),
    GOOGLE_AUTH_ALLOWED_EMAILS: commaSeparatedEmailsParser({
        allowEmpty: true,
        desc: 'The list of google emails that are allowed to sign into the app. Emails are comma separated',
        example: "email1@google.it,email2@google.it"
    }),
    OPENAI_MODEL: str({
        desc: 'The model to use with the OpenAI API',
        example: 'gpt-5',
    }),
});
