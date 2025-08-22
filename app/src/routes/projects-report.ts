import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { ProjectNotFound, ProjectSectionNotFound, ProjectSectionUncompleted } from "../exceptions/project-errors.js";
import { ProjectExporterService } from "../services/ProjectExporterService.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
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

        if ([ProjectNotFound, ProjectSectionNotFound].some(etype => error instanceof etype))
            reply.status(404).send({ message: error.message })

        if (error instanceof ProjectSectionUncompleted)
            reply.status(409).send({ message: error.message })
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
