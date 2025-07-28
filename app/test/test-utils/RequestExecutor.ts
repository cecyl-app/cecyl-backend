import FormData from 'form-data'
import { FastifyInstance } from "fastify";

const PROJECTS_ROUTE_PREFIX = '/projects'

export class RequestExecutor {
    // ****************************** Projects APIs
    /**
     * @param app 
     * @param name project name
     * @param context project context
     * @returns 
     */
    static async createProject(app: FastifyInstance, name: string, context: string) {
        return await app.inject({
            method: 'POST',
            url: `${PROJECTS_ROUTE_PREFIX}`,
            body: {
                name: name,
                context: context
            }
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


    static async deleteProject(app: FastifyInstance, projectId: string) {
        return await app.inject({
            method: 'DELETE',
            url: `${PROJECTS_ROUTE_PREFIX}/${projectId}`
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