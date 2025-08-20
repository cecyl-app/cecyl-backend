import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';

import build from '../../src/build-server.js'
import { CreateProjectResponseBody, GetProjectResponseBody } from '../../src/routes/projects.js'
import { RequestExecutor } from '../test-utils/RequestExecutor.js';
import { ConversationsTestUtils } from '../test-utils/ConversationsTestUtils.js';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars --
 * TODO: types.d.ts is not imported in test/ files and can only be manually imported
 **/
import * as extendedFastify from '../../src/types/index.js'
import { ResponseTestUtils } from '../test-utils/ResponseTestUtils.js';
import { CreateSectionResponseBody, SendSectionPromptResponseBody } from '../../src/routes/projects-sections.js';

let app: FastifyInstance

beforeAll(async () => {
    app = await build({
        logger: {
            level: 'info'
        }
    });
})


afterAll(async () => {
    await ConversationsTestUtils.deleteAllConversations(app.conversationsRepo)

    await app.close()
})


describe('project sections', () => {
    let projectId: string

    beforeAll(async () => {
        const createProjectResponse = await RequestExecutor.createProject(app, {
            name: 'my project',
            context: 'my project context',
            language: 'italian'
        })

        projectId = createProjectResponse.json<CreateProjectResponseBody>().id
    })


    afterAll(async () => {
        await RequestExecutor.deleteProject(app, projectId)
    })


    test('Create-Read-Delete workflow', async () => {
        const TEST_SECTION_NAME = 'test section'

        // create section
        const createSectionResponse = await RequestExecutor.createSection(app, projectId, {
            name: TEST_SECTION_NAME
        })
        ResponseTestUtils.assertStatus201(createSectionResponse)
        const sectionId = createSectionResponse.json<CreateSectionResponseBody>().id
        expect(sectionId).toBeDefined()

        // get project info
        const getProjectInfoResponse = await RequestExecutor.getProjectInfo(app, projectId)

        let project = getProjectInfoResponse.json<GetProjectResponseBody>()
        expect(project.sectionIdsOrder).toContain(sectionId)
        let section = project.sections.find(s => s.id === sectionId)
        expect(section).toBeDefined()
        expect(section).toMatchObject({
            id: sectionId,
            name: TEST_SECTION_NAME,
            history: []
        })

        // delete section
        const deleteSectionResponse = await RequestExecutor.deleteSection(app, projectId, sectionId)
        ResponseTestUtils.assertStatus200(deleteSectionResponse)

        // get the project info
        const getProjectInfoResponse2 = await RequestExecutor.getProjectInfo(app, projectId)

        project = getProjectInfoResponse2.json<GetProjectResponseBody>()
        expect(project.sectionIdsOrder).not.toContain(sectionId)
        section = project.sections.find(s => s.id === sectionId)
        expect(section).toBeUndefined()
    }, 30000);


    describe('section operations', () => {
        const TEST_SECTION_NAME = 'test section'
        let sectionId: string

        beforeEach(async () => {
            const createSectionResponse = await RequestExecutor.createSection(app, projectId, {
                name: TEST_SECTION_NAME
            })

            sectionId = createSectionResponse.json<CreateSectionResponseBody>().id
        })

        afterEach(async () => {
            await RequestExecutor.deleteSection(app, projectId, sectionId)
        })

        test('given a project section, when updateSection is called, then section fields are modified', async () => {
            // update the section info
            const updateSectionResponse = await RequestExecutor.updateSection(app, projectId, sectionId, {
                name: TEST_SECTION_NAME + "-new",
            })
            ResponseTestUtils.assertStatus200(updateSectionResponse)

            // get the project info
            const getProjectResponse = await RequestExecutor.getProjectInfo(app, projectId)
            const project = getProjectResponse.json<GetProjectResponseBody>()
            const section = project.sections.find(s => s.id === sectionId)
            expect(section?.name).toBe(TEST_SECTION_NAME + "-new");
        }, 30000);


        test('send "request" type prompt in section', async () => {
            const PROMPT = '1+1=?'

            // send ask prompt
            const sendAskPromptResponse = await RequestExecutor.sendAskPrompt(app, projectId, sectionId, {
                prompt: PROMPT
            })
            const output = sendAskPromptResponse.json<SendSectionPromptResponseBody>().output
            ResponseTestUtils.assertStatus200(sendAskPromptResponse)
            expect(output.length).toBeGreaterThan(0)

            // get project info
            const getProjectInfoResponse = await RequestExecutor.getProjectInfo(app, projectId)

            const project = getProjectInfoResponse.json<GetProjectResponseBody>()
            const sectionHistory = project.sections.find(s => s.id === sectionId)!.history
            expect(sectionHistory.length).toBe(2)
            expect(sectionHistory[0]).toMatchObject({
                type: 'request',
                content: PROMPT
            })
            expect(sectionHistory[1]).toMatchObject({
                type: 'response',
                content: output
            })
        }, 30000);


        test('send "improve" type prompt in section', async () => {
            const IMPROVE_PROMPT = '1+1=2'

            // send improve prompt
            const sendImprovePromptResponse = await RequestExecutor.sendImprovePrompt(app, projectId, sectionId, {
                prompt: IMPROVE_PROMPT
            })
            ResponseTestUtils.assertStatus200(sendImprovePromptResponse)

            // get project info
            const getProjectInfoResponse = await RequestExecutor.getProjectInfo(app, projectId)

            const project = getProjectInfoResponse.json<GetProjectResponseBody>()
            const sectionHistory = project.sections.find(s => s.id === sectionId)!.history
            expect(sectionHistory.length).toBe(1)
            expect(sectionHistory[0]).toMatchObject({
                type: 'improve',
                content: IMPROVE_PROMPT
            })
        }, 30000);
    })
});