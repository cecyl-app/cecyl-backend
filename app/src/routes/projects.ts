import { FastifyInstance, FastifyRegisterOptions, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

const createProjectRequestSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        context: { type: 'string' }
    },
    required: ['name', 'context'],
} as const;
type CreateProjectRequestBody = FromSchema<typeof createProjectRequestSchema>;

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
                body: createProjectRequestSchema,
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