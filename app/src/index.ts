import build from "./build-server.js"

const server = await build({
    logger: {
        level: 'info'
    }
})

server.listen({ port: 80, host: '0.0.0.0' }, (err) => {
    if (err) {
        server.log.error(err)
        process.exit(1)
    }
})