import fastify, { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import OpenAI from "openai";
import fastifyMultipart from "@fastify/multipart";
import fastifyMongodb from "@fastify/mongodb";

import filesRoutes from './routes/files.js'
import projectsRoutes from './routes/projects.js'

export default async function build(opts = {}) {
    const app = fastify(opts);

    app.register(fastifyPlugin(openAIConnectionDecorator, { name: 'openAIConnection' }))
    app.register(fastifyPlugin(openAISharedVectorStoreDecorator, { dependencies: ['openAIConnection'] }))
    app.register(fastifyMongodb, {
        forceClose: true,
        url: process.env['DB_CONN_STRING']
    })
    app.register(fastifyMultipart)
    app.register(filesRoutes)
    app.register(projectsRoutes)

    return app;
}

async function openAIConnectionDecorator(fastify, opts) {
    fastify.decorate('openaiClient', new OpenAI())
}

async function openAISharedVectorStoreDecorator(fastify: FastifyInstance, opts) {
    const SHARED_VECTOR_STORE_NAME = "Shared files";
    // get only the first one created, which is the shared one
    const vectorStores = await fastify.openaiClient.vectorStores.list({ limit: 10, order: "asc" });

    let sharedVectorStore = vectorStores.data.find(vs => vs.name === SHARED_VECTOR_STORE_NAME);

    // Create new vector store if shared one does not exist
    if (sharedVectorStore === undefined) {
        sharedVectorStore = await fastify.openaiClient.vectorStores.create({
            name: SHARED_VECTOR_STORE_NAME
        });
    }

    fastify.decorate('sharedVectorStoreId', sharedVectorStore.id)
}