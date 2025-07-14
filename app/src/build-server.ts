import fastify from "fastify";
import fastifyPlugin from "fastify-plugin";
import OpenAI from "openai";

export default async function build(opts = {}) {
    const app = fastify(opts);

    app.register(fastifyPlugin(openAIConnectionDecorator))

    return app;
}

async function openAIConnectionDecorator(fastify, opts) {
    fastify.decorate('openaiClient', () => {
        return new OpenAI();
    })
}