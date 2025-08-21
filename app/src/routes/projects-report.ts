import { FastifyInstance, FastifyServerOptions } from "fastify";
import { FromSchema } from "json-schema-to-ts";

import { ProjectsRepository } from "../repositories/ProjectsRepository.js";
import { ProjectNotFound, ProjectSectionNotFound, ProjectSectionUncompleted } from "../exceptions/project-errors.js";
import { OpenAIResponseError } from "../exceptions/openai-error.js";
import { Project } from "../types/mongo.js";
import { ProjectExporterService } from "../services/ProjectExporterService.js";


export default function routes(fastify: FastifyInstance, _options: FastifyServerOptions) {
    const projectsRepo = fastify.projectsRepo
    const projectExporterService = new ProjectExporterService()

    fastify.post<{ Params: GenerateProjectPdfRequestParams }>(
        '/projects/:projectId/generateMarkdown',
        {
            schema: {
                params: generateProjectPdfRequestParamsSchema
            }
        },
        async (request, reply) => {
            const projectInfo = request.params
            const result = await generatePdf(projectInfo, projectsRepo, projectExporterService)

            reply.status(200).header('Content-Type', 'application/octet-stream').send(result)
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


const generateProjectPdfRequestParamsSchema = {
    type: 'object',
    properties: {
        projectId: { type: 'string' }
    },
    required: ['projectId']
} as const;
export type GenerateProjectPdfRequestParams = FromSchema<typeof generateProjectPdfRequestParamsSchema>;

/**
 * Generate the pdf of a project
 * @param projectInfo 
 * @param projectsRepo
 * @returns the pdf as stream
 */
async function generatePdf(
    projectInfo: GenerateProjectPdfRequestParams,
    projectsRepo: ProjectsRepository,
    projectExporterService: ProjectExporterService
): Promise<Buffer> {
    const project = await projectsRepo.getProject(projectInfo.projectId, ['name', 'sectionIdsOrder', 'sections'])

    if (project === null)
        throw new ProjectNotFound(projectInfo.projectId)

    return await projectExporterService.exportProjectToPdf(projectInfo.projectId, project)
}
