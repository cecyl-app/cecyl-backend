import { url, str, envsafe, makeValidator, bool } from 'envsafe';
import { InvalidInput } from './exceptions/generic-error.js';

const commaSeparatedEmailsValidator = makeValidator<string[]>((input: string) => {
    const emails = input.split(",").map(s => s.trim());
    if (!emails.every(e => /^[^@]+@[^@]+\.[^@]+$/.test(e)))
        throw new InvalidInput("comma-separated list of emails", input);

    return emails;
})

const sameSiteCookieOptionValidator = makeValidator<'none' | 'lax' | 'strict'>(input => {
    if (!['none', 'lax', 'strict'].includes(input))
        throw new InvalidInput("'none' | 'lax' | 'strict'", input);

    return input as 'none' | 'lax' | 'strict';
})

export const env = envsafe({
    NODE_ENV: str({
        choices: ['test', 'production'],
    }),
    OPENAI_MODEL: str({
        desc: 'The model to use with the OpenAI API',
        example: 'gpt-5',
    }),
    DB_CONN_STRING: str({
        desc: 'The connection string for the DB',
        example: 'mongodb://mongouser:password@db:27017/cecyldb?authSource=admin'
    }),
    GOOGLE_AUTH_CLIENT_ID: str({
        desc: 'The client ID of the Google Auth. See https://console.cloud.google.com/auth/clients',
    }),
    GOOGLE_AUTH_ALLOWED_EMAILS: commaSeparatedEmailsValidator({
        allowEmpty: true,
        desc: 'The list of google emails that are allowed to sign into the app. Emails are comma separated',
        example: "email1@google.it,email2@google.it"
    }),
    WEBAPP_DOMAIN: url({
        desc: 'The domain of the web application. It is used to setup CORS',
        example: 'http://localhost:5000'
    }),
    SESSION_COOKIE_SAME_SITE: sameSiteCookieOptionValidator({
        desc: 'SameSite option passed to secure-session fastify plugin'
    }),
    SESSION_COOKIE_SECURE: bool({
        desc: 'Secure option passed to secure-session fastify plugin'
    })
});
