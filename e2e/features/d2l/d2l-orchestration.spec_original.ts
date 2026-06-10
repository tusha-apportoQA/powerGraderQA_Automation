import { test, expect } from '../../fixtures';
import { Page } from '@playwright/test';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow1';
import { D2LLMS } from '../../components/lms/d2l/D2LLMS';
import { D2LLMSStudent } from '../../components/lms/d2l/D2LLMSStudent';
import { getD2LAssignmentConfigs } from '../../test-data/assignments/d2l';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getD2LConfig } from '../../config/d2l.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';

test.use({ headless: false });

test.describe('D2L LMS Orchestration [POW-471] @d2l @orchestration', () => {
    const allConfigs = getD2LAssignmentConfigs();
    // Matching Canvas: Slice to 4 or process all
    const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

    test.describe('D2L Teacher & Student Orchestration', () => {
        test.describe.configure({ mode: 'parallel' });

        const studentUser = testUsers.find(user => user.role === 'student' && user.lms === 'd2l');
        if (!studentUser) {
            throw new Error('D2L Student user not found in test users configuration');
        }
        const studentEmail = studentUser.username;

        for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
            test.describe(`Assignment: ${assignmentConfig.title}`, () => {
                

                // STABLE TITLE GENERATION (Matches Canvas logic)
                const timestamp = Date.now();
                const uniqueTitle = `${assignmentConfig.title} [${timestamp}]`;

                // --- PHASE 1: CREATE ASSIGNMENT ---
                test(`Create assignment and setup rubric: ${assignmentConfig.title}`, async ({ d2lTeacherPage }) => {
                    test.setTimeout(300000);
                    console.log(`\n🚀 [${uniqueTitle}] Starting Assignment Creation...`);
                    
                    const lms = new D2LLMS(d2lTeacherPage.page);
                    
                    await AllureHelper.step('Create assignment in D2L', async () => {
                        if (assignmentConfig.rubric) {
                            console.log(`[${uniqueTitle}] Setting up rubric: ${assignmentConfig.rubric.type}`);
                        }
                        await lms.createAssignment({ ...assignmentConfig, title: uniqueTitle });
                        console.log(`✅ [${uniqueTitle}] Assignment Created.`);
                    });
                });

                // --- PHASE 2: STUDENT SUBMISSION ---
                if (assignmentConfig.submissionType) {
                    test(`Submit ${assignmentConfig.submissionType} for: ${assignmentConfig.title}`, async ({ d2lStudentPage }) => {
                        test.setTimeout(300000);
                        console.log(`📩 [${uniqueTitle}] Starting Student Submission...`);
                        
                        const lms = new D2LLMSStudent(d2lStudentPage.page);
                        const { courseName } = getD2LConfig();

                        await AllureHelper.step('Submit assignment', async () => {
                            await lms.dashboardPage.goto(lms.baseURL);
                            await lms.dashboardPage.selectCourse(courseName);
                            await lms.coursePage.clickAssignments();
                            await lms.assignmentListPage.clickAssignment(uniqueTitle);
                            
                            if (assignmentConfig.submissionType === 'Text Entry') {
                                await lms.verifyFileTypeAndSubmit(uniqueTitle, 'Text Entry', undefined, getSubmissionText());
                            } else {
                                const filePath = getSubmissionFilePath(assignmentConfig.submissionFile);
                                await lms.verifyFileTypeAndSubmit(uniqueTitle, assignmentConfig.submissionType!, filePath);
                            }
                            console.log(`✅ [${uniqueTitle}] Submission Uploaded.`);
                        });
                    });
                }

                // --- PHASE 3: GRADE AND PUBLISH ---
                test(`Grade and publish for: ${assignmentConfig.title}`, async ({ d2lTeacherPage }) => {
                    test.setTimeout(1200000);
                    const lms = new D2LLMS(d2lTeacherPage.page);
                    let powerGraderPage: Page;

                    await AllureHelper.step('Navigate to PowerGrader', async () => {
                        await lms.navigateToCourse();
                        console.log(`[${uniqueTitle}] Launching PowerGrader Tool...`);
                        powerGraderPage = await lms.navigateToPowerGrader();
                    });

                    await AllureHelper.step('Run Universal Workflow', async () => {
                        // This calls the shared workflow utility
                        await executeUniversalPGWorkflow(powerGraderPage, uniqueTitle, studentEmail);
                    });
                });
            }); 
        } 
    });
});

