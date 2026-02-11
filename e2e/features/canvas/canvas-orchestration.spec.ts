import { test } from '../../fixtures';
import { Page } from '@playwright/test';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { PowerGraderCoursePage } from '../../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../../components/powergrader/pages/PowerGraderGradingPage';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { loadAssignments, saveAssignment } from '../../utils/assignmentStorage';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';

test.use({ headless: false });

test.describe('Canvas Orchestration @canvas', () => {
    // Use first 4 configs for orchestration (orchestration test configs)
    const allConfigs = getCanvasAssignmentConfigs();
    const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

    test.describe('Canvas LMS Teacher Orchestration [POW-413]', () => {
        test.describe.configure({ mode: 'parallel' });

        for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
            test(`Create assignment and setup rubric: ${assignmentConfig.title}`, async ({ canvasTeacherPage }) => {
                test.setTimeout(300000);
                
                AllureHelper.label('Test Type', 'Assignment Creation');
                AllureHelper.label('LMS', 'Canvas');
                AllureHelper.label('Role', 'Teacher');
                AllureHelper.label('Assignment', assignmentConfig.title);
                AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');
                AllureHelper.label('Rubric Type', assignmentConfig.rubric?.type || 'N/A');

                const lms = new CanvasLMS(canvasTeacherPage.page);
                
                await AllureHelper.step('Create assignment in Canvas', async () => {
                    await lms.createAssignment(assignmentConfig);
                    await AllureHelper.attachScreenshot(canvasTeacherPage.page, 'Assignment Created');
                });

                await AllureHelper.step('Extract and save assignment ID', async () => {
                    const assignmentId = await lms.getAssignmentIdFromUrl();
                    saveAssignment({
                        title: assignmentConfig.title,
                        assignmentId: assignmentId,
                        submissionType: assignmentConfig.submissionType
                    });
                    AllureHelper.label('Assignment ID', assignmentId);
                    await AllureHelper.attachText('Assignment ID', assignmentId);
                });
            });
        }
    });

    test.describe('Student Submissions', () => {
        test.describe.configure({ mode: 'parallel' });

        const storedAssignments = loadAssignments();

        for (const storedAssignment of storedAssignments) {
            const assignmentConfig = ASSIGNMENT_CONFIGS.find(config => config.title === storedAssignment.title);

            if (!assignmentConfig) {
                test(`Submit for: ${storedAssignment.title}`, async () => {
                    test.skip(true, `Assignment config not found for: ${storedAssignment.title}`);
                });
                continue;
            }

            if (!assignmentConfig.submissionType) {
                test(`Submit for: ${storedAssignment.title}`, async () => {
                    test.skip(true, `Submission type not defined for: ${storedAssignment.title}`);
                });
                continue;
            }

            test(`Submit ${assignmentConfig.submissionType} for: ${storedAssignment.title}`, async ({ canvasStudentPage }) => {
                test.setTimeout(300000);
                
                AllureHelper.label('Test Type', 'Student Submission');
                AllureHelper.label('LMS', 'Canvas');
                AllureHelper.label('Role', 'Student');
                AllureHelper.label('Assignment', storedAssignment.title);
                AllureHelper.label('Assignment ID', storedAssignment.assignmentId);
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
                    await lms.assignmentListPage.clickAssignmentAndValidateId(storedAssignment.title, storedAssignment.assignmentId);
                    await lms.assignmentDetailsPage.expectAssignmentDetailsLoaded();
                    await lms.assignmentDetailsPage.verifyAssignmentTitle(storedAssignment.title);
                    await AllureHelper.attachScreenshot(canvasStudentPage.page, 'Assignment Details Page');
                });

                await AllureHelper.step('Submit assignment', async () => {
                    const submissionType = assignmentConfig.submissionType;
                    if (submissionType === 'Text Entry') {
                        const submissionText = getSubmissionText();
                        await lms.verifyFileTypeAndSubmit(submissionType, undefined, submissionText);
                    } else if (submissionType) {
                        const filePath = getSubmissionFilePath(submissionType);
                        await lms.verifyFileTypeAndSubmit(submissionType, filePath);
                    } else {
                        throw new Error(`Submission type is required for assignment: ${storedAssignment.title}`);
                    }
                    await AllureHelper.attachScreenshot(canvasStudentPage.page, 'Submission Complete');
                });
            });
        }
    });

    test.describe('Grade and Publish in PowerGrader', () => {
        test.describe.configure({ mode: 'parallel' });

        const storedAssignments = loadAssignments();
        const studentUser = testUsers.find(user => user.role === 'student');
        if (!studentUser) {
            throw new Error('Student user not found in test users configuration');
        }
        const studentEmail = studentUser.username;

        for (const storedAssignment of storedAssignments) {
            test(`Grade and publish for: ${storedAssignment.title}`, async ({ canvasTeacherPage }) => {
                test.setTimeout(300000);
                
                AllureHelper.label('Test Type', 'Grade and Publish');
                AllureHelper.label('LMS', 'Canvas');
                AllureHelper.label('Role', 'Teacher');
                AllureHelper.label('Assignment', storedAssignment.title);
                AllureHelper.label('Assignment ID', storedAssignment.assignmentId);
                AllureHelper.label('Student Email', studentEmail);

                const lms = new CanvasLMS(canvasTeacherPage.page);
                let powerGraderPage: Page;

                await AllureHelper.step('Navigate to PowerGrader', async () => {
                    await lms.navigateToCourse();
                    powerGraderPage = await lms.navigateToPowerGrader();
                    await powerGraderPage.waitForLoadState('networkidle');
                    await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Course Page');
                });

                await AllureHelper.step('Navigate to assignment details', async () => {
                    const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
                    await powerGraderCoursePage.waitForLoad();
                    await powerGraderCoursePage.expectCoursePageLoaded();
                    await powerGraderCoursePage.clickViewButtonForAssignment(storedAssignment.title);
                    await AllureHelper.attachScreenshot(powerGraderPage, 'Assignment Submissions List');
                });

                await AllureHelper.step('Open student submission', async () => {
                    const powerGraderAssignmentDetailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
                    await powerGraderAssignmentDetailsPage.waitForLoad();
                    await powerGraderAssignmentDetailsPage.expectPageLoaded(storedAssignment.title);
                    await powerGraderAssignmentDetailsPage.clickViewButtonForStudent(studentEmail);
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
        }
    });
});
