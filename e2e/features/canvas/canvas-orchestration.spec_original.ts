import { test, expect } from '../../fixtures';
import { Page } from '@playwright/test';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';

test.use({ headless: false });

test.describe('Canvas Orchestration @canvas @orchestration', () => {
    const allConfigs = getCanvasAssignmentConfigs();
    const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

    test.describe('Canvas LMS Teacher Orchestration [POW-413]', () => {
        test.describe.configure({ mode: 'parallel' });

        const studentUser = testUsers.find(user => user.role === 'student');
        if (!studentUser) {
            throw new Error('Student user not found in test users configuration');
        }
        const studentEmail = studentUser.username;

        for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
            test.describe(`Assignment: ${assignmentConfig.title}`, () => {
                test.describe.configure({ mode: 'serial' });

                const timestamp = Date.now();
                const uniqueTitle = `${assignmentConfig.title} [${timestamp}]`;

                test(`Create assignment and setup rubric: ${assignmentConfig.title}`, async ({ canvasTeacherPage }) => {
                    test.setTimeout(300000);
                    const uniqueConfig = { ...assignmentConfig, title: uniqueTitle };
                    const lms = new CanvasLMS(canvasTeacherPage.page);
                    
                    await AllureHelper.step('Create assignment in Canvas', async () => {
                        await lms.createAssignment(uniqueConfig);
                    });
                });

                if (assignmentConfig.submissionType) {
                    test(`Submit ${assignmentConfig.submissionType} for: ${assignmentConfig.title}`, async ({ canvasStudentPage }) => {
                        test.setTimeout(300000);
                        const lms = new CanvasLMSStudent(canvasStudentPage.page);
                        const { courseName } = getCanvasConfig();

                        await AllureHelper.step('Submit assignment', async () => {
                            await lms.dashboardPage.goto(lms.baseURL);
                            await lms.dashboardPage.selectCourse(courseName);
                            await lms.coursePage.clickAssignments();
                            await lms.assignmentListPage.clickAssignment(uniqueTitle);
                            
                            if (assignmentConfig.submissionType === 'Text Entry') {
                                await lms.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
                            } else {
                                const filePath = getSubmissionFilePath(assignmentConfig.submissionType as any);
                                await lms.verifyFileTypeAndSubmit(assignmentConfig.submissionType!, filePath);
                            }
                        });
                    });
                }

                test(`Grade and publish for: ${assignmentConfig.title}`, async ({ canvasTeacherPage }) => {
                    test.setTimeout(1200000);
                    const lms = new CanvasLMS(canvasTeacherPage.page);
                    let powerGraderPage: Page;

                    await AllureHelper.step('Navigate to PowerGrader', async () => {
                        await lms.navigateToCourse();
                        powerGraderPage = await lms.navigateToPowerGrader();
                    });

                    await AllureHelper.step('Run Universal Workflow', async () => {
                        await executeUniversalPGWorkflow(powerGraderPage, uniqueTitle, studentEmail);
                    });

                    // --- BACKUP OF ORIGINAL LOGIC (Commented Out) ---
                    /*
                    await AllureHelper.step('Wait for PowerGrader Sync (Assignment & Student)', async () => {
                        const startTime = Date.now();
                        const MAX_WAIT = 15 * 60 * 1000;
                        const INTERVAL = 30 * 1000;    
                        let isAssignmentFound = false;

                        while (Date.now() - startTime < MAX_WAIT) {
                            console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
                            try {
                                if (!powerGraderPage) {
                                    await lms.navigateToCourse();
                                    powerGraderPage = await lms.navigateToPowerGrader(); 
                                } else {
                                    await powerGraderPage.reload({ waitUntil: 'networkidle' });
                                }
                                const assignmentRow = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: uniqueTitle }).last();
                                if (await assignmentRow.isVisible()) {
                                    const studentViewButton = assignmentRow.getByText('View', { exact: true }).first();
                                    if (await studentViewButton.isVisible({ timeout: 20000 })) {
                                        studentViewButton.click();
                                        isAssignmentFound = true;
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.log(`[${uniqueTitle}] Syncing...`);
                            }
                            await new Promise(res => setTimeout(res, INTERVAL));
                        }
                    });
                    */
                });
            }); // End of assignment serial describe
        } // End of for loop
    }); // End of Teacher Orchestration describe
}); // End of Canvas Orchestration describe
                    