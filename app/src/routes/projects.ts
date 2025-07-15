import { FastifyInstance, FastifyRegisterOptions, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

const createProjectRequestBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' }
    },
    required: ['name', 'context'],
} as const;
type CreateProjectRequestBody = FromSchema<typeof createProjectRequestBodySchema>;

async function createProject(
    request: FastifyRequest<{ Body: CreateProjectRequestBody }>,
    reply: FastifyReply
): Promise<void> {

}

export default async function routes(fastify: FastifyInstance, options: FastifyServerOptions) {
    fastify.post<{ Body: CreateProjectRequestBody }>(
        '/',
        {
            schema: {
                body: createProjectRequestBodySchema,
                response: {
                    201: {
                        type: 'string',
                    },
                },
            }
        },
        createProject
    )
}