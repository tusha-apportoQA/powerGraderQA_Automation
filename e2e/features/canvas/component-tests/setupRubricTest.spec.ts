import { test, CanvasTeacherPage } from '../../../fixtures';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { getSampleAssignmentConfigs } from '../../../test-data/sample/assignmentConfigs';

type TestFixtures = { canvasTeacherPage: CanvasTeacherPage };

test.use({ headless: false });

test.describe('Component Test: Rubric Setup', () => {
    const sampleConfigs = getSampleAssignmentConfigs();
    const assignmentIndex = 5;

    test('Setup rubric for assignment from sample configs', async ({ canvasTeacherPage }: TestFixtures) => {
        test.setTimeout(300000);
        
        if (assignmentIndex < 0 || assignmentIndex >= sampleConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${sampleConfigs.length - 1}`);
        }

        const config = sampleConfigs[assignmentIndex];
        if (!config) {
            throw new Error(`Assignment config not found at index ${assignmentIndex}`);
        }

        const lms = new CanvasLMS(canvasTeacherPage.page);

        await lms.navigateToCourse();
        await lms.coursePage.clickAssignments();
        await lms.assignmentListPage.expectAssignmentsListLoaded();
        await lms.assignmentListPage.clickAssignment(config.title);
        await lms.assignmentDetailsPage.expectAssignmentDetailsLoaded();
        await lms.assignmentDetailsPage.verifyAssignmentTitle(config.title);

        if (config.rubric) {
            await lms.assignmentDetailsPage.setRubric(config.rubric);
        }
    });
});
