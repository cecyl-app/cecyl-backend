export class ProjectNotFound extends Error {
    constructor(projectId, options?: ErrorOptions) {
        super(`project with id ${projectId} does not exist`, options);
    }
}