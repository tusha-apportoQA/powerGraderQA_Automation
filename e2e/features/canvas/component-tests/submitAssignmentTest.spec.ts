import { test, CanvasStudentPage } from '../../../fixtures';
import { CanvasLMSStudent } from '../../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../../test-data/submissions';
import { getCanvasConfig } from '../../../config/canvas.config';

type TestFixtures = { 
    canvasStudentPage: CanvasStudentPage;
};

test.use({ headless: false });

test.describe('Component Test: Assignment Submission', () => {
    // Use configs starting from index 4 (component test configs)
    const allConfigs = getCanvasAssignmentConfigs();
    const sampleConfigs = allConfigs.slice(4);
    const assignmentIndex = 0;

    test('Submit assignment from sample configs', async ({ canvasStudentPage }: TestFixtures) => {
        test.setTimeout(300000);
        
        if (assignmentIndex < 0 || assignmentIndex >= sampleConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${sampleConfigs.length - 1}`);
        }

        const config = sampleConfigs[assignmentIndex];
        if (!config || !config.submissionType) {
            throw new Error(`Assignment config not found at index ${assignmentIndex}`);
        }

        const studentLms = new CanvasLMSStudent(canvasStudentPage.page);
        const { courseName } = getCanvasConfig();

        await studentLms.dashboardPage.goto(studentLms.baseURL);
        await studentLms.dashboardPage.expectDashboardLoaded();
        await studentLms.dashboardPage.selectCourse(courseName);
        await studentLms.coursePage.expectCoursePageLoaded();
        await studentLms.coursePage.clickAssignments();
        await studentLms.assignmentListPage.expectAssignmentsListLoaded();
        await studentLms.assignmentListPage.clickAssignment(config.title);
        await studentLms.assignmentDetailsPage.expectAssignmentDetailsLoaded();
        await studentLms.assignmentDetailsPage.verifyAssignmentTitle(config.title);

        if (config.submissionType === 'Text Entry') {
            const submissionText = getSubmissionText();
            await studentLms.verifyFileTypeAndSubmit(config.submissionType, undefined, submissionText);
        } else if (config.submissionType) {
            const filePath = getSubmissionFilePath(config.submissionType);
            await studentLms.verifyFileTypeAndSubmit(config.submissionType, filePath);
        }
    });
});
