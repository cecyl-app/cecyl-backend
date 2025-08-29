import { readFile } from 'node:fs/promises';

import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import fastifyPlugin from "fastify-plugin";
import OpenAI from "openai";
import fastifyMultipart from "@fastify/multipart";
import fastifyMongodb from "@fastify/mongodb";
import cors from '@fastify/cors'
import secureSession from '@fastify/secure-session'

import authRoutes from './routes/auth.js'
import filesRoutes from './routes/files.js'
import projectsRoutes from './routes/projects.js'
import projectSectionsRoutes from './routes/projects-sections.js'
import projectReportRoutes from './routes/projects-report.js'
import { OpenAIService } from "./services/OpenAIService.js";
import { ProjectsRepository } from "./repositories/ProjectsRepository.js";
import { ConversationsRepository } from "./repositories/ConversationsRepository.js";
import constants from "./constants.js";

export default async function build(opts = {}) {
    const app = fastify(opts);

    await app.register(cors, {
        origin: '*',
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE']
    })

    await app.register(secureSession, {
        sessionName: 'session',
        key: await readFile(constants.session.keyPath),
        expiry: 24 * 60 * 60 * 7, // 7 days
        cookie: {
            path: '/',
            httpOnly: true
        }
    })
    await app.register(fastifyMultipart)
    await app.register(fastifyMongodb, {
        forceClose: true,
        url: process.env.DB_CONN_STRING
    })

    await app.register(fastifyPlugin(projectsRepositoryDecorator,
        { name: 'projectsRepository', dependencies: ['@fastify/mongodb'] }))
    await app.register(fastifyPlugin(conversationsRepositoryDecorator,
        { name: 'conversationsRepository', dependencies: ['@fastify/mongodb'] }))
    await app.register(fastifyPlugin(openAIServiceDecorator,
        { name: 'openAIService', dependencies: ['projectsRepository', 'conversationsRepository'] }))

    await app.register(authRoutes)
    await app.register(filesRoutes)
    await app.register(projectsRoutes)
    await app.register(projectSectionsRoutes)
    await app.register(projectReportRoutes)

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
