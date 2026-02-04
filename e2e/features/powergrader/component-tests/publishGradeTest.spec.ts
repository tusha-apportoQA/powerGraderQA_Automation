import { test, CanvasTeacherPage } from '../../../fixtures';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { PowerGraderCoursePage } from '../../../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../../../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../../../components/powergrader/pages/PowerGraderGradingPage';
import { getSampleAssignmentConfigs } from '../../../test-data/sample/assignmentConfigs';
import testUsers from '../../../test_users';

type TestFixtures = { canvasTeacherPage: CanvasTeacherPage };

test.use({ headless: false });

test.describe('Component Test: Grading and Publishing', () => {
    const sampleConfigs = getSampleAssignmentConfigs();
    const studentUser = testUsers.find(user => user.role === 'student');
    if (!studentUser) {
        throw new Error('Student user not found in test users configuration');
    }
    const studentEmail = studentUser.username;
    const assignmentIndex = 1;

    test('Grade and publish assignment in PowerGrader', async ({ canvasTeacherPage }: TestFixtures) => {
        test.setTimeout(300000);
        
        if (assignmentIndex < 0 || assignmentIndex >= sampleConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${sampleConfigs.length - 1}`);
        }

        const config = sampleConfigs[assignmentIndex];
        if (!config || !config.title) {
            throw new Error(`Assignment config not found at index ${assignmentIndex}`);
        }

        const lms = new CanvasLMS(canvasTeacherPage.page);

        await lms.navigateToCourse();
        const powerGraderPage = await lms.navigateToPowerGrader();
        await powerGraderPage.waitForLoadState('networkidle');

        test.expect(powerGraderPage).toBeTruthy();

        const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
        await powerGraderCoursePage.waitForLoad();
        await powerGraderCoursePage.expectCoursePageLoaded();
        await powerGraderCoursePage.clickViewButtonForAssignment(config.title);

        const powerGraderAssignmentDetailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
        await powerGraderAssignmentDetailsPage.waitForLoad();
        await powerGraderAssignmentDetailsPage.expectPageLoaded(config.title);
        await powerGraderAssignmentDetailsPage.clickViewButtonForStudent(studentEmail);

        const powerGraderGradingPage = new PowerGraderGradingPage(powerGraderPage);
        await powerGraderGradingPage.waitForLoad();
        await powerGraderGradingPage.expectPageLoaded();
        await powerGraderGradingPage.clickPublishButton();
    });
});
