import { Page, expect } from '@playwright/test';
import { PowerGraderCoursePage } from '../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
import { AllureHelper } from './allureHelper';

export async function executeUniversalPGWorkflow(
    powerGraderPage: Page, 
    uniqueTitle: string, 
    studentEmail: string
) {
    const startTime = Date.now();
    const INTERVAL = 30000; // 30 seconds

    // PHASE 1: Course Page Sync
    console.log(`\n🚀 [START] Grade and Publish Workflow for: ${uniqueTitle}`);
    
   // PHASE 1: Course Page Sync
    await expect(async () => {
        console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
        await powerGraderPage.reload({ waitUntil: 'networkidle' });
        
        const coursePage = new PowerGraderCoursePage(powerGraderPage);
        await coursePage.waitForLoad();
        
        // Improved row locator: specifically looking for the row containing your unique title
        const row = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: uniqueTitle }).last();
        
        if (await row.isVisible()) {
            console.log(`[${uniqueTitle}] Assignment found. Clicking on "View"...`);
            
            // Target the 'View' link/button specifically within that row
            const viewBtn = row.getByRole('link', { name: 'View', exact: true }).or(row.getByText('View', { exact: true }));
            
            // FIX: Ensure we wait for the navigation/load after clicking
            await Promise.all([
                powerGraderPage.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                viewBtn.first().click()
            ]);
            
            // Verify we actually left the dashboard and reached the details page
            const detailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
            await expect(powerGraderPage).not.toHaveURL(/.*dashboard.*/); // Adjust regex based on your URL structure
        } else {
            throw new Error(`[${uniqueTitle}] Syncing... assignment row not visible yet.`);
        }
    }).toPass({ timeout: 600000, intervals: [INTERVAL] });

    // PHASE 2: Assignment Details Page Sync
    console.log(`[${uniqueTitle}] Waiting for student submission to sync on Details Page...`);
    const detailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);

    await expect(async () => {
        console.log(`[${uniqueTitle}] Waiting for AI Grading to Complete...`);
        await powerGraderPage.reload({ waitUntil: 'networkidle' });

        // Handle Rubric Generation Blocker
        const generateBtn = powerGraderPage.locator('button').filter({ hasText: "Generate Compatible Rubric" });
        if (await generateBtn.isVisible()) {
            console.log(`[${uniqueTitle}] No Rubric banner found. Clicking Generate...`);
            await generateBtn.click();
            throw new Error('Triggered rubric generation, waiting for AI...');
        }

        // Handle Incompatibility Blocker
        const incompatible = powerGraderPage.locator('div, span').filter({ hasText: /Assignment Incompatible|PowerGrader may not be able to grade/i }).first();
        if (await incompatible.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log(`[${uniqueTitle}] Incompatible detected. Bypassing...`);
            await detailsPage.clickSeeWhy();
            await detailsPage.clickGradeAnyway();
            throw new Error('Bypassing incompatibility, retrying sync...');
        }

        // Final "Start Reviewing" Check
        const startBtn = powerGraderPage.locator('button').filter({ hasText: /^Start Reviewing$/i });
        if (await startBtn.isVisible({ timeout: 10000 })) {
            console.log(`[${uniqueTitle}] AI Grading cycle complete. Clicking "Start Reviewing"...`);
            await startBtn.click();
        } else {
            throw new Error('Waiting for "Start Reviewing" button to appear...');
        }
    }).toPass({ timeout: 600000, intervals: [INTERVAL] });

    // PHASE 3: Grading and Publishing
    const gradingPage = new PowerGraderGradingPage(powerGraderPage);

    //await gradingPage.waitForLoad();
    //await gradingPage.verifyGradesAndFeedbackPopulated();
    await expect(async () => {
        console.log(`[${uniqueTitle}] Grading Page: Verifying AI results...`);
        
        try {
            await gradingPage.waitForLoad();
            await gradingPage.verifyGradesAndFeedbackPopulated();
        } catch (error) {
            console.log(`[${uniqueTitle}] Results not visible. Reloading Grading Page...`);
            await powerGraderPage.reload({ waitUntil: 'networkidle' });
            throw error; // Rethrow to trigger the expect.toPass retry
        }
    }).toPass({ 
        timeout: 180000, // 3 minutes total for this phase
        intervals: [15000] // Wait 15s between reloads
    });

    const finalScore = await gradingPage.getTotalScore();
    console.log(`[${uniqueTitle}] ✅ AI Grade Verified. Final Score: ${finalScore}`);

    console.log(`[${uniqueTitle}] Generating detailed grading report...`);
    await gradingPage.logGradingReport();
    
    await gradingPage.clickPublishButton();
    console.log(`[${uniqueTitle}] Waiting for redirect to Assignment Details...`);

    // PHASE 4: Final Confirmation
    // Wait for the URL to stabilize before looking for buttons
    await powerGraderPage.waitForURL(/.*assignments\/RegisterAssignment.*/, { timeout: 30000 });

    // FIX 2: Use a broader regex and a slightly longer timeout
    const allReviewedBtn = powerGraderPage.locator('button').filter({ hasText: /Submissions Reviewed|All Reviewed/i });
    //const allReviewedBtn = powerGraderPage.getByRole('button', { name: /All Submissions Reviewed/i });
    await expect(allReviewedBtn).toBeVisible({ timeout: 90000 });
    console.log(`[${uniqueTitle}] Redirect successful: "All Submissions Reviewed" is visible.`);

    //const studentRow = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: studentEmail });
    const studentRow = powerGraderPage.locator('tr, div[role="row"]').filter({ 
        hasText: studentEmail.split('@')[0] 
    });
    //await expect(studentRow.locator('text="Yes"')).toBeVisible({ timeout: 15000 });
    //await expect(studentRow.locator('text="Yes"')).toBeVisible({ timeout: 30000 });
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ [FINISH] Total Sync successful after ${duration} minutes for ${studentEmail}.`);
}