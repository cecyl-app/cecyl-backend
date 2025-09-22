import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { ProjectNotFound, ProjectSectionNotFound, ProjectSectionUncompleted } from "../exceptions/project-errors.js";
import { ProjectExporterService } from "../services/ProjectExporterService.js";
import addCheckUserIsLogged from "../middlewares/auth.js";
import { UnauthorizedUserError } from "../exceptions/auth-error.js";
import { ErrorUtils } from "../utils/error-utils.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    addCheckUserIsLogged(fastify)

    const projectsRepo = fastify.projectsRepo
    const projectExporterService = new ProjectExporterService()

    fastify.post<{ Params: GenerateProjectDocxRequestParams }>(
        '/projects/:projectId/generateDocx',
        {
            schema: {
                params: generateProjectDocxRequestParamsSchema
            }
        },
        async (request, reply) => {
            const projectInfo = request.params
            const result = await generateDocx(projectInfo, projectsRepo, projectExporterService)

            reply
                .status(200)
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                .send(result)
        }
    )


    fastify.setErrorHandler(function (error, request, reply) {
        fastify.log.error(error)

        const handleObj = ErrorUtils.getRouteErrorCode(error, new Map<new (...args) => Error, number>([
            [ProjectNotFound, 404],
            [ProjectSectionNotFound, 404],
            [ProjectSectionUncompleted, 409],
            [UnauthorizedUserError, 403]
        ]))

        if (handleObj.canBeHandled)
            reply.status(handleObj.statusCode).send({ message: error.message })
        else
            throw error
    })
}


const generateProjectDocxRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId']
} as const;
export type GenerateProjectDocxRequestParams = FromSchema<typeof generateProjectDocxRequestParamsSchema>;

/**
 * Generate the docx of a project
 * @param projectInfo 
 * @param projectsRepo
 * @returns the docx as stream
 */
async function generateDocx(
    projectInfo: GenerateProjectDocxRequestParams,
    projectsRepo: ProjectsRepository,
    projectExporterService: ProjectExporterService
): Promise<Buffer> {
    const project = await projectsRepo.getProject(projectInfo.projectId, ['name', 'sectionIdsOrder', 'sections'])

    if (project === null)
        throw new ProjectNotFound(projectInfo.projectId)

    return await projectExporterService.exportProjectToMSOfficeWord(projectInfo.projectId, project)
}
