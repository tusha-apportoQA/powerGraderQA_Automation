import { test, CanvasTeacherPage } from '../../../fixtures';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { PowerGrader } from '../../../components/powergrader/PowerGrader';
import { executeIgWorkflow } from '../../../utils/ig-workflow';
import testUsers from '../../../test_users';
import { getCanvasConfig } from '../../../config/canvas.config';

type TestFixtures = { canvasTeacherPage: CanvasTeacherPage };

/**
 * Assignment must already exist in Canvas/PowerGrader with a graded submission for the student
 * (student row shows "View details", not "Grade Now"). Use the exact title shown in PowerGrader.
 */
const ASSIGNMENT_NAME =
    process.env.PG_INTERACTIVE_GRADE_ASSIGNMENT_TITLE ?? 'Short Accurate No Rubric DOCX [1779966914071]';

test.use({ headless: false });

test.describe('Component Test: Interactive grade (grading page entry)', () => {
    test('Opens student submission grading page via PowerGrader facade', async ({
        canvasTeacherPage,
    }: TestFixtures) => {
        test.setTimeout(600_000);

        const {studentNames} = getCanvasConfig()

        const lms = new CanvasLMS(canvasTeacherPage.page);
        await lms.navigateToCourse();
        const powerGraderPage = await lms.navigateToPowerGrader();
        await powerGraderPage.waitForLoadState('domcontentloaded');

        const powerGrader = new PowerGrader(powerGraderPage);
        await powerGrader.openStudentSubmissionForAssignment(ASSIGNMENT_NAME, studentNames[0]);

        await powerGrader.gradingPage.expectPageLoaded();
        await powerGrader.gradingPage.verifyGradesAndFeedbackPopulated();
        await executeIgWorkflow(powerGraderPage);
    });
});