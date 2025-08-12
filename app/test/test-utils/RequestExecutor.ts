import FormData from 'form-data'
import { FastifyInstance } from "fastify";

import { CreateProjectRequestBody, UpdateProjectRequestBody } from '../../src/routes/projects.js'
import { CreateSectionRequestBody, SendSectionImproveRequestBody, SendSectionPromptRequestBody } from '../../src/routes/projects-sections.js'

export class RequestExecutor {
    // ****************************** Projects APIs
    static async createProject(app: FastifyInstance, projectInfo: CreateProjectRequestBody) {
        return await app.inject({
            method: 'POST',
            url: `/projects`,
            body: projectInfo
        })
    }


    static async listProjects(app: FastifyInstance) {
        return await app.inject({
            method: 'GET',
            url: '/projects'
        })
    }


    static async getProjectInfo(app: FastifyInstance, projectId: string) {
        return await app.inject({
            method: 'GET',
            url: `/projects/${projectId}`
        });
    }

    static async updateProjectInfo(app: FastifyInstance, projectId: string, updateProjectInfo: UpdateProjectRequestBody) {
        return await app.inject({
            method: 'PUT',
            url: `/projects/${projectId}`,
            body: updateProjectInfo
        });
    }


    static async deleteProject(app: FastifyInstance, projectId: string) {
        return await app.inject({
            method: 'DELETE',
            url: `/projects/${projectId}`
        });
    }


    // ****************************** Project sections APIs
    static async createSection(app: FastifyInstance, projectId: string, sectionInfo: CreateSectionRequestBody) {
        return await app.inject({
            method: 'POST',
            url: `/projects/${projectId}/sections`,
            body: sectionInfo
        })
    }


    static async sendAskPrompt(app: FastifyInstance, projectId: string, sectionId: string, body: SendSectionPromptRequestBody) {
        return await app.inject({
            method: 'POST',
            url: `/projects/${projectId}/sections/${sectionId}/ask`,
            body: body
        })
    }


    static async sendImprovePrompt(app: FastifyInstance, projectId: string, sectionId: string, body: SendSectionImproveRequestBody) {
        return await app.inject({
            method: 'POST',
            url: `/projects/${projectId}/sections/${sectionId}/improve`,
            body: body
        });
    }


    static async deleteSection(app: FastifyInstance, projectId: string, sectionId: string) {
        return await app.inject({
            method: 'DELETE',
            url: `/projects/${projectId}/sections/${sectionId}`
        });
    }


    // ****************************** File search APIs (scope: shared)
    static async uploadSharedFiles(app: FastifyInstance, form: FormData) {
        return await app.inject({
            method: 'POST',
            url: '/search-files/shared',
            headers: form.getHeaders(),
            body: form
        })
    }


    static async listSharedFiles(app: FastifyInstance) {
        return await app.inject({
            method: 'GET',
            url: '/search-files/shared'
        })
    }


    static async deleteSharedFile(app: FastifyInstance, fileId: string) {
        return await app.inject({
            method: 'DELETE',
            url: `/search-files/shared/${fileId}`
        })
    }


    // ****************************** File search APIs (scope: project)
    static async uploadProjectFiles(app: FastifyInstance, projectId: string, form: FormData) {
        return await app.inject({
            method: 'POST',
            url: `/projects/${projectId}/search-files`,
            headers: form.getHeaders(),
            body: form
        })
    }


    static async listProjectFiles(app: FastifyInstance, projectId: string) {
        return await app.inject({
            method: 'GET',
            url: `/projects/${projectId}/search-files`
        })
    }


    static async deleteProjectFile(app: FastifyInstance, projectId: string, fileId: string) {
        return await app.inject({
            method: 'DELETE',
            url: `/projects/${projectId}/search-files/${fileId}`
        })
    }
}