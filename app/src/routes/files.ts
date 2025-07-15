import fs from 'node:fs/promises'

import { FastifyInstance, FastifyRegisterOptions, FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";

async function uploadSharedFiles(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const parts = request.files()

    for await (const part of parts) {
        //  part.file, fs.createWriteStream(part.filename))
    }
    reply.send()
}


async function uploadProjectFiles(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {

}



export default async function routes(fastify: FastifyInstance, options: FastifyServerOptions) {
    fastify.post('/search-files/shared', uploadSharedFiles)
}