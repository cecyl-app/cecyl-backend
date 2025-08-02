import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import fastifyPlugin from "fastify-plugin";
import OpenAI from "openai";
import fastifyMultipart from "@fastify/multipart";
import fastifyMongodb from "@fastify/mongodb";

import filesRoutes from './routes/files.js'
import projectsRoutes from './routes/projects.js'
import { OpenAIService } from "./third-party/OpenAIService.js";
import { ProjectsRepository } from "./repositories/ProjectsRepository.js";
import { ConversationsRepository } from "./repositories/ConversationsRepository.js";

export default async function build(opts = {}) {
    const app = fastify(opts);

    app.register(fastifyMultipart)
    app.register(fastifyMongodb, {
        forceClose: true,
        url: process.env.DB_CONN_STRING
    })

    app.register(fastifyPlugin(projectsRepositoryDecorator,
        { name: 'projectsRepository', dependencies: ['@fastify/mongodb'] }))
    app.register(fastifyPlugin(conversationsRepositoryDecorator,
        { name: 'conversationsRepository', dependencies: ['@fastify/mongodb'] }))
    app.register(fastifyPlugin(openAIServiceDecorator,
        { name: 'openAIService', dependencies: ['projectsRepository', 'conversationsRepository'] }))

    app.register(filesRoutes)
    app.register(projectsRoutes)

    return app;
}


function projectsRepositoryDecorator(fastify: FastifyInstance, _opts: FastifyServerOptions) {
    fastify.decorate('projectsRepo', new ProjectsRepository(fastify.mongo.client))
}


function conversationsRepositoryDecorator(fastify: FastifyInstance, _opts: FastifyServerOptions) {
    fastify.decorate('conversationsRepo', new ConversationsRepository(fastify.mongo.client))
}


async function openAIServiceDecorator(fastify: FastifyInstance, _opts: FastifyServerOptions) {
    const openAIService = await OpenAIService.create(
        new OpenAI(), fastify.projectsRepo, fastify.conversationsRepo
    )
    fastify.decorate('openAIService', openAIService)
}