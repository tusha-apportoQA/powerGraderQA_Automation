import { test, CanvasTeacherPage } from '../../../fixtures';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { PowerGraderCoursePage } from '../../../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../../../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../../../components/powergrader/pages/PowerGraderGradingPage';
import { getCanvasAssignmentConfigs } from '../../../test-data/assignments/canvas';
import testUsers from '../../../test_users';

type TestFixtures = { canvasTeacherPage: CanvasTeacherPage };

test.use({ headless: false });

test.describe('Component Test: Grading and Publishing', () => {
    // Use configs starting from index 4 (component test configs)
    const allConfigs = getCanvasAssignmentConfigs();
    const sampleConfigs = allConfigs.slice(4);
    const studentUser = testUsers.find(user => user.role === 'student');
    if (!studentUser) {
        throw new Error('Student user not found in test users configuration');
    }
    const studentEmail = studentUser.username;
    const assignmentIndex = 1;

    test('Grade and publish assignment in PowerGrader', async ({ canvasTeacherPage }: TestFixtures) => {
        test.setTimeout(600000);
        
        if (assignmentIndex < 0 || assignmentIndex >= sampleConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${sampleConfigs.length - 1}`);
        }
        const config = sampleConfigs[assignmentIndex];
        const lms = new CanvasLMS(canvasTeacherPage.page);

        await lms.navigateToCourse();
        const powerGraderPage = await lms.navigateToPowerGrader();
        await powerGraderPage.waitForLoadState('networkidle');

        const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
        await powerGraderCoursePage.waitForLoad();
        await powerGraderCoursePage.expectCoursePageLoaded();
        
        // Use a regex to catch 'View details' or 'Grade Now' at the course level
        const assignmentRow = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: config.title }).last();
        await assignmentRow.locator('button, a').filter({ hasText: /View|Grade Now/i }).first().click();

        // --- NEW POLLING LOGIC START ---
        console.log(`[${config.title}] Entering Details Page Sync...`);
        
        await test.expect(async () => {
            console.log(`[${config.title}] Reloading to check for status or 'No Rubric' banner...`);
            await powerGraderPage.reload({ waitUntil: 'networkidle' });
            
            // Locators based on your provided HTML/Selectors
            const noRubricText = powerGraderPage.locator('p').filter({ 
                hasText: "There is currently no rubric. We can't begin grading without one." 
            });
            const generateBtn = powerGraderPage.locator('button').filter({ 
                hasText: "Generate Compatible Rubric" 
            });

            // 1. Check for the Blocker
            if (await noRubricText.isVisible() || await generateBtn.isVisible()) {
                console.log(`[${config.title}] Blocker Found: Clicking 'Generate' now...`);
                await generateBtn.first().click();
                // Force retry to wait for AI progress
                throw new Error('Rubric generation triggered. Waiting for AI processing...');
            }

            // 2. Check for the Final 'View details' State
            const studentRow = powerGraderPage.locator('div, tr').filter({ hasText: studentEmail }).last();
            const viewButton = studentRow.getByRole('button', { name: 'View details', exact: true });
            
            console.log(`[${config.title}] Checking for 'View details' button status...`);
            await test.expect(viewButton).toBeVisible({ timeout: 5000 });
        }).toPass({ 
            intervals: [30000], 
            timeout: 540000 // 9-minute poll for the AI lifecycle
        });
        // --- NEW POLLING LOGIC END ---

        const powerGraderAssignmentDetailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
        await powerGraderAssignmentDetailsPage.clickViewButtonForStudent(studentEmail);

        const powerGraderGradingPage = new PowerGraderGradingPage(powerGraderPage);
        await powerGraderGradingPage.waitForLoad();
        await powerGraderGradingPage.expectPageLoaded();
        
        // Ensure grades are actually there before publishing
        await powerGraderGradingPage.verifyGradesAndFeedbackPopulated();
        await powerGraderGradingPage.clickPublishButton();
    });
});
