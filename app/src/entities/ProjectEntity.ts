import { ProjectSectionNotFound } from "../exceptions/project-errors.js";
import { Project } from "../types/mongo.js";

export default class ProjectEntity {
    protected id: string
    protected project: Project

    constructor(id: string, project: Project) {
        this.id = id
        this.project = project
    }

    get name() {
        return this.project.name
    }

    get context() {
        return this.project.context
    }

    get sections() {
        const sectionIdsOrder = this.project.sectionIdsOrder.map(id => id.toString())
        const sortedSections = Array.from(this.project.sections).sort((sec1, sec2) => {
            const sec1Pos = sectionIdsOrder.indexOf(sec1.id.toString())
            const sec2Pos = sectionIdsOrder.indexOf(sec2.id.toString())

            if (sec1Pos === -1)
                throw new ProjectSectionNotFound(this.id, sec1.id.toString())

            if (sec2Pos === -1)
                throw new ProjectSectionNotFound(this.id, sec2.id.toString())

            return sec1Pos - sec2Pos;
        })

        return sortedSections
    }
}