import * as mdToDocx from "@mohtasham/md-to-docx";

import { ProjectSectionUncompleted } from "../exceptions/project-errors.js";
import { Project } from "../types/mongo.js";
import ProjectEntity from "../entities/ProjectEntity.js";


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
        const projectEntity = new ProjectEntity(projectId, project)

        const renderedSections = projectEntity.sections.map(sec => {
            const sectionContent = sec.history.at(-1)

            if (sectionContent === undefined)
                throw new ProjectSectionUncompleted(projectId, sec.id.toString())

            return `\n##${sec.name}\n\n${sectionContent.content}\n`
        })

        return Promise.resolve(`#${projectEntity.name}\n\n---\n${renderedSections.join('')}`)
    }
}
