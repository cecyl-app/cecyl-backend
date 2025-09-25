import { describe, expect, test } from '@jest/globals';
import { Project } from '../../src/types/mongo.js';
import { ObjectId } from '@fastify/mongodb';
import { ProjectExporterService } from '../../src/services/ProjectExporterService.js';


describe('project exporter service', () => {
    test('given a markdown generation, when the sections are unordered, sections are ordered', async () => {
        const project: Project = {
            name: 'test project',
            context: 'not present in markdown',
            vectorStoreId: 'not present in markdown',
            sections: [
                {
                    id: new ObjectId('000000000000000000000003'),
                    name: 'section3',
                    history: [
                        {
                            type: 'request',
                            content: 'request3_1'
                        },
                        {
                            type: 'response',
                            content: 'response3_2'
                        }
                    ]
                },
                {
                    id: new ObjectId('000000000000000000000001'),
                    name: 'section1',
                    history: [
                        {
                            type: 'improve',
                            content: 'response1'
                        }
                    ]
                },
                {
                    id: new ObjectId('000000000000000000000002'),
                    name: 'section2',
                    history: [
                        {
                            type: 'improve',
                            content: 'response2'
                        }
                    ]
                }
            ],
            sectionIdsOrder: [
                new ObjectId('000000000000000000000001'),
                new ObjectId('000000000000000000000002'),
                new ObjectId('000000000000000000000003')
            ]
        }
        const projectExporterService = new ProjectExporterService()

        const markdown = await projectExporterService.exportProjectToMarkdown("projectId1", project)

        expect(markdown).toBe(
            `# ${project.name}\n\n---\n` +
            `\n## ${project.sections[1].name}\n\n${project.sections[1].history[0].content}\n` +
            `\n## ${project.sections[2].name}\n\n${project.sections[2].history[0].content}\n` +
            `\n## ${project.sections[0].name}\n\n${project.sections[0].history[1].content}\n`
        )
    });
});