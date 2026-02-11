import { test, CanvasTeacherPage } from '../../../fixtures';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { getCanvasAssignmentConfigs } from '../../../test-data/assignments/canvas';

type TestFixtures = { canvasTeacherPage: CanvasTeacherPage };

test.use({ headless: false });

test.describe('Component Test: Rubric Setup', () => {
    // Use configs starting from index 4 (component test configs)
    const allConfigs = getCanvasAssignmentConfigs();
    const sampleConfigs = allConfigs.slice(4);
    const assignmentIndex = 1;

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
