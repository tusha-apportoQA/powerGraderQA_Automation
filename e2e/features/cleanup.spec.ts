import { test } from '../fixtures';
import { CanvasLMS } from '../components/lms/canvas/CanvasLMS';
import { D2LLMS } from '../components/lms/d2l/D2LLMS';
import { MoodleLMS } from '../components/lms/moodle/MoodleLMS';

test.use({ headless: false });

test.describe('Automation assignment cleanup', () => {
    test.describe.configure({ mode: 'serial' });

    test('Canvas — PowerGrader candidates, delete on Canvas', async ({ canvasTeacherPage }) => {
        test.setTimeout(900_000);
        await new CanvasLMS(canvasTeacherPage.page).cleanupAutomationAssignments();
    });

    test('D2L — PowerGrader candidates, delete on D2L', async ({ d2lTeacherPage }) => {
        test.setTimeout(900_000);
        await new D2LLMS(d2lTeacherPage.page).cleanupAutomationAssignments();
    });

    test('Moodle — PowerGrader candidates, delete on Moodle', async ({ moodleTeacherPage }) => {
        test.setTimeout(900_000);
        await new MoodleLMS(moodleTeacherPage.page).cleanupAutomationAssignments();
    });
});
