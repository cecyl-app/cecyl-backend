import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";
import { OAuth2Client } from "google-auth-library";

import { InvalidAuthCredentialsError, UnauthorizedUserError } from "../exceptions/auth-error.js";
import { env } from "../envs.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    fastify.post<{ Body: GoogleSigninRequestBody }>(
        '/auth/signin/google',
        {
            schema: {
                body: googleSigninRequestBodySchema
            }
        },
        async (request, reply) => {
            const authInfo = request.body
            const userId = (await googleSignIn(authInfo)).userId;

            request.session.set('userId', userId)

            reply.status(200).send()
        }
    )

    fastify.post('/auth/logout',
        async (request, reply) => {
            request.session.delete()
            reply.status(200).send()
        }
    )

    fastify.setErrorHandler(function (error, request, reply) {
        fastify.log.error(error)

        if (error instanceof InvalidAuthCredentialsError)
            reply.status(401).send({ message: error.message })

        if (error instanceof UnauthorizedUserError)
            reply.status(403).send({ message: error.message })
    })
}


const googleSigninRequestBodySchema = {
    type: 'object',
    properties: {
        idToken: { type: 'string' }
    },
    required: ['idToken']
} as const;
export type GoogleSigninRequestBody = FromSchema<typeof googleSigninRequestBodySchema>;

/**
 * Sign in with google (if idToken is valid) and set the session cookie
 * @param projectInfo 
 */
async function googleSignIn(
    authInfo: GoogleSigninRequestBody
): Promise<{ userId: string }> {
    const idToken = authInfo.idToken

    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: env.GOOGLE_AUTH_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (payload?.email === undefined || (payload.email_verified ?? false) === false) {
        throw new InvalidAuthCredentialsError("Google token id does not include the email, or it is not verified")
    }

    if (!env.GOOGLE_AUTH_ALLOWED_EMAILS.includes(payload.email)) {
        throw new UnauthorizedUserError(payload.email)
    }

    return { userId: payload.email }
}