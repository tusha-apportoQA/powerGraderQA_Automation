import { test, CanvasTeacherPage } from '../../../fixtures';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { getSampleAssignmentConfigs } from '../../../test-data/sample/assignmentConfigs';

type TestFixtures = { canvasTeacherPage: CanvasTeacherPage };

test.use({ headless: false });

test.describe('Component Test: Assignment Creation', () => {
    const sampleConfigs = getSampleAssignmentConfigs();
    const assignmentIndex = 9;

    test('Create assignment from sample configs', async ({ canvasTeacherPage }: TestFixtures) => {
        test.setTimeout(300000);
        
        if (assignmentIndex < 0 || assignmentIndex >= sampleConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${sampleConfigs.length - 1}`);
        }

        const config = sampleConfigs[assignmentIndex];
        if (!config) {
            throw new Error(`Assignment config not found at index ${assignmentIndex}`);
        }

        const lms = new CanvasLMS(canvasTeacherPage.page);
        await lms.createAssignment(config);

        const assignmentId = await lms.getAssignmentIdFromUrl();
        test.expect(assignmentId).toBeTruthy();
    });
});
