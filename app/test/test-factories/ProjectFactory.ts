import { FastifyInstance } from "fastify";
import { RequestExecutor } from "../test-utils/RequestExecutor.js";
import { CreateProjectResponseBody } from "../../src/routes/projects.js";

export const TEST_PROJECT_NAME = 'my test project'
export const TEST_PROJECT_CONTEXT = 'my project context'

export class ProjectFactory {
    app: FastifyInstance

    constructor(app: FastifyInstance) {
        this.app = app
    }

    async createProject(): Promise<string> {
        const createProjectResponse = await RequestExecutor.createProject(this.app, {
            name: TEST_PROJECT_NAME,
            context: TEST_PROJECT_CONTEXT,
            language: 'english'
        })

        const projectId = createProjectResponse.json<CreateProjectResponseBody>().id
        return projectId
    }
}