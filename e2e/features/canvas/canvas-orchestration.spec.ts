import { test } from '../../fixtures';
import { Page } from '@playwright/test';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { PowerGraderCoursePage } from '../../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../../components/powergrader/pages/PowerGraderGradingPage';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';

test.use({ headless: false });

test.describe('Canvas Orchestration @canvas @orchestration', () => {
    const allConfigs = getCanvasAssignmentConfigs();
    const ASSIGNMENT_CONFIGS = allConfigs.slice(1, 2);

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
                    
                    AllureHelper.label('Test Type', 'Assignment Creation');
                    AllureHelper.label('LMS', 'Canvas');
                    AllureHelper.label('Role', 'Teacher');
                    AllureHelper.label('Assignment', uniqueTitle);
                    AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');
                    AllureHelper.label('Rubric Type', assignmentConfig.rubric?.type || 'N/A');

                    const lms = new CanvasLMS(canvasTeacherPage.page);
                    
                    await AllureHelper.step('Create assignment in Canvas', async () => {
                        await lms.createAssignment(uniqueConfig);
                        await AllureHelper.attachScreenshot(canvasTeacherPage.page, 'Assignment Created');
                    });
                });

                if (!assignmentConfig.submissionType) {
                    test(`Submit for: ${assignmentConfig.title}`, async () => {
                        test.skip(true, `Submission type not defined for: ${assignmentConfig.title}`);
                    });
                } else {
                    test(`Submit ${assignmentConfig.submissionType} for: ${assignmentConfig.title}`, async ({ canvasStudentPage }) => {
                        test.setTimeout(300000);
                        
                        AllureHelper.label('Test Type', 'Student Submission');
                        AllureHelper.label('LMS', 'Canvas');
                        AllureHelper.label('Role', 'Student');
                        AllureHelper.label('Assignment', uniqueTitle);
                        AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');

                        const lms = new CanvasLMSStudent(canvasStudentPage.page);
                        const { courseName } = getCanvasConfig();

                        await AllureHelper.step('Navigate to Canvas dashboard', async () => {
                            await lms.dashboardPage.goto(lms.baseURL);
                            await lms.dashboardPage.expectDashboardLoaded();
                        });

                        await AllureHelper.step('Select course and navigate to assignments', async () => {
                            await lms.dashboardPage.selectCourse(courseName);
                            await lms.coursePage.expectCoursePageLoaded();
                            await lms.coursePage.clickAssignments();
                            await lms.assignmentListPage.expectAssignmentsListLoaded();
                        });

                        await AllureHelper.step('Open assignment details', async () => {
                            await lms.assignmentListPage.clickAssignment(uniqueTitle);
                            await lms.assignmentDetailsPage.expectAssignmentDetailsLoaded();
                            await lms.assignmentDetailsPage.verifyAssignmentTitle(uniqueTitle);
                            await AllureHelper.attachScreenshot(canvasStudentPage.page, 'Assignment Details Page');
                        });

                        await AllureHelper.step('Submit assignment', async () => {
                            const submissionType = assignmentConfig.submissionType!;
                            if (submissionType === 'Text Entry') {
                                const submissionText = getSubmissionText();
                                await lms.verifyFileTypeAndSubmit(submissionType, undefined, submissionText);
                            } else {
                                const filePath = getSubmissionFilePath(submissionType);
                                await lms.verifyFileTypeAndSubmit(submissionType, filePath);
                            }
                            await AllureHelper.attachScreenshot(canvasStudentPage.page, 'Submission Complete');
                        });
                    });
                }

                test(`Grade and publish for: ${assignmentConfig.title}`, async ({ canvasTeacherPage }) => {
                    test.setTimeout(900000);
                    
                    AllureHelper.label('Test Type', 'Grade and Publish');
                    AllureHelper.label('LMS', 'Canvas');
                    AllureHelper.label('Role', 'Teacher');
                    AllureHelper.label('Assignment', uniqueTitle);
                    AllureHelper.label('Student Email', studentEmail);

                    const SYNC_WAIT_TIME = process.env.POWERGRADER_SYNC_WAIT 
                        ? parseInt(process.env.POWERGRADER_SYNC_WAIT) 
                        : 12 * 60 * 1000;

                    console.log(`[${uniqueTitle}] Waiting ${SYNC_WAIT_TIME / 1000 / 60} minutes for PowerGrader sync...`);
                    await new Promise(resolve => setTimeout(resolve, SYNC_WAIT_TIME));
                    console.log(`[${uniqueTitle}] Wait complete, launching PowerGrader...`);

                    const lms = new CanvasLMS(canvasTeacherPage.page);
                    let powerGraderPage: Page;

                    await AllureHelper.step('Launch PowerGrader and navigate to assignment', async () => {
                        await lms.navigateToCourse();
                        powerGraderPage = await lms.navigateToPowerGrader();
                        await powerGraderPage.waitForLoadState('networkidle');
                        await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Course Page');

                        const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
                        await powerGraderCoursePage.waitForLoad();
                        await powerGraderCoursePage.expectCoursePageLoaded();
                        await powerGraderCoursePage.clickViewButtonForAssignment(uniqueTitle);
                        await AllureHelper.attachScreenshot(powerGraderPage, 'Assignment Submissions List');
                    });

                    await AllureHelper.step('Check for student View button and open submission', async () => {
                        const powerGraderAssignmentDetailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
                        await powerGraderAssignmentDetailsPage.waitForLoad();
                        await powerGraderAssignmentDetailsPage.expectPageLoaded(uniqueTitle);
                        
                        const studentEmailText = powerGraderPage.getByText(studentEmail, { exact: false }).first();
                        const isStudentVisible = await studentEmailText.isVisible({ timeout: 5000 }).catch(() => false);
                        
                        if (isStudentVisible) {
                            const studentRow = studentEmailText.locator('xpath=ancestor::tr').first();
                            const studentViewButton = studentRow.getByText('View', { exact: true }).first();
                            const viewButtonFound = await studentViewButton.isVisible({ timeout: 5000 }).catch(() => false);
                            
                            if (viewButtonFound) {
                                console.log(`[${uniqueTitle}] Student View button found, opening submission...`);
                                await powerGraderAssignmentDetailsPage.clickViewButtonForStudent(studentEmail);
                            } else {
                                console.log(`[${uniqueTitle}] Student View button not found in PowerGrader`);
                                await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Sync Failed');
                                throw new Error('Student View button not found in PowerGrader');
                            }
                        } else {
                            console.log(`[${uniqueTitle}] Student not visible in PowerGrader`);
                            await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Sync Failed');
                            throw new Error('Student not visible in PowerGrader assignment details');
                        }
                    });

                    await AllureHelper.step('Publish grades', async () => {
                        const powerGraderGradingPage = new PowerGraderGradingPage(powerGraderPage);
                        await powerGraderGradingPage.waitForLoad();
                        await powerGraderGradingPage.expectPageLoaded();
                        await AllureHelper.attachScreenshot(powerGraderPage, 'Grading Page Before Publish');
                        await powerGraderGradingPage.clickPublishButton();
                        await AllureHelper.attachScreenshot(powerGraderPage, 'Grading Page After Publish');
                    });
                });
            });
        }
    });
});
