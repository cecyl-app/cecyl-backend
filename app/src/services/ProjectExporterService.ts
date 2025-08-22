import * as mdToDocx from "@mohtasham/md-to-docx";

import { ProjectSectionNotFound, ProjectSectionUncompleted } from "../exceptions/project-errors.js";
import { Project } from "../types/mongo.js";


export class ProjectExporterService {
    /**
     * Generate a DOCX document for the project, using the markdown returned by
     * @function exportProjectToMarkdown
     * @param projectId 
     * @param project 
     * @returns 
     */
    async exportProjectToMSOfficeWord(projectId: string, project: Project): Promise<Buffer> {
        const markdown = await this.exportProjectToMarkdown(projectId, project)
        const docxContent = await mdToDocx.convertMarkdownToDocx(markdown)

        return Buffer.from(await docxContent.arrayBuffer())
    }


    /**
     * Generate a Markdown document that encapsulate the project name and the latest
     * responses for each section, ordered by sectionIdsOrder
     * @param projectId 
     * @param project 
     * @returns 
     */
    async exportProjectToMarkdown(projectId: string, project: Project): Promise<string> {
        const sectionIdsOrder = project.sectionIdsOrder.map(id => id.toString())
        const renderedSections = Array.from(project.sections).sort((sec1, sec2) => {
            const sec1Pos = sectionIdsOrder.indexOf(sec1.id.toString())
            const sec2Pos = sectionIdsOrder.indexOf(sec2.id.toString())

            if (sec1Pos === -1)
                throw new ProjectSectionNotFound(projectId, sec1.id.toString())

            if (sec2Pos === -1)
                throw new ProjectSectionNotFound(projectId, sec2.id.toString())

            return sec1Pos - sec2Pos;
        }).map(sec => {
            const sectionContent = sec.history.at(-1)

            if (sectionContent === undefined)
                throw new ProjectSectionUncompleted(projectId, sec.id.toString())

            return `\n##${sec.name}\n\n${sectionContent.content}\n`
        })

        return Promise.resolve(`#${project.name}\n\n---\n${renderedSections.join('')}`)
    }
}
