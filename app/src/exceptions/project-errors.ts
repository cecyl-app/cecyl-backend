export class ProjectNotFound extends Error {
    constructor(projectId: string, options?: ErrorOptions) {
        super(`project with id ${projectId} does not exist`, options);
    }
}

export class ProjectSectionNotFound extends Error {
    constructor(projectId: string, sectionId: string, options?: ErrorOptions) {
        super(`project with id ${projectId} does not have a section with id ${sectionId}`, options);
    }
}

export class ProjectSectionUncompleted extends Error {
    constructor(projectId: string, sectionId: string, options?: ErrorOptions) {
        super(`project with id ${projectId} has an uncompleted section (${sectionId})`, options);
    }
}