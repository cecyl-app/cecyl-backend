import { FastifyInstance } from "fastify";
import { UnauthorizedUserError } from "../exceptions/auth-error.js";

export default function addCheckUserIsLogged(app: FastifyInstance) {
    if (process.env.NODE_ENV === 'production') {
        app.addHook('preHandler', async (request, _reply) => {
            if (request.session.get('userId') === undefined)
                throw new UnauthorizedUserError('anonymous')
        })
    }
}