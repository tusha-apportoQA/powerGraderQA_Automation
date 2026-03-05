import { Page, expect } from '@playwright/test';
    import { PowerGraderCoursePage } from '../components/powergrader/pages/PowerGraderCoursePage';
    import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
    import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
    import { AllureHelper } from './allureHelper';
    import { baselineExists, createBaseline, loadBaseline } from '../utils/powergrader-baseline';
    import { compareRubricSnapshots, normCriterionName } from '../utils/sbert-compare';

import { TeacherEditConfig } from '../types';

    export async function executeUniversalPGWorkflow(
        powerGraderPage: Page, 
        uniqueTitle: string, 
        studentEmail: string,
        baselineKey: string,
        teacherEdits?: TeacherEditConfig
    ) {
        const assignmentKey = uniqueTitle.replace(/\s*\[\d+\]\s*$/, "").trim();
        console.log("BASELINE KEY:", assignmentKey);
        const startTime = Date.now();
        const INTERVAL = 30000; // 30 seconds
        const NO_VALID_SUBMISSIONS_FAIL_MS = 10 * 60 * 1000; // 10 minutes
        let noValidSeenAt: number | null = null;

    // PHASE 1: Course Page Sync
    console.log(`\n🚀 [START] Grade and Publish Workflow for: ${uniqueTitle}`);
    
    await expect(async () => {
        console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
        await powerGraderPage.reload({ waitUntil: 'networkidle' });             
        const coursePage = new PowerGraderCoursePage(powerGraderPage);
        await coursePage.waitForLoad();
        
        const row = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: uniqueTitle }).last();
        
        if (await row.isVisible()) {
            console.log(`[${uniqueTitle}] Assignment found. Clicking on "View"...`);
            const viewBtn = row.getByRole('link', { name: 'View', exact: true }).or(row.getByText('View', { exact: true }));
            
            await Promise.all([
                powerGraderPage.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                viewBtn.first().click()
            ]);
            
            await expect(powerGraderPage).not.toHaveURL(/.*dashboard.*/);
        } else {
            throw new Error(`[${uniqueTitle}] Syncing... assignment row not visible yet.`);
        }
    }).toPass({ timeout: 600000, intervals: [INTERVAL] });

    // PHASE 2: Assignment Details Page Sync
    const detailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
    let rubricGenerateClicked = false;

    await expect(async () => {
        console.log(`[${uniqueTitle}] Waiting for AI Grading to Complete...`);
        await powerGraderPage.reload({ waitUntil: 'networkidle' });

        const noValidSubmissionsBanner = powerGraderPage
            .locator('div, span, p, td, th')
            .filter({ hasText: /No valid submissions to Grade/i })
            .first();

        if (await noValidSubmissionsBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
            if (!noValidSeenAt) noValidSeenAt = Date.now();
            const elapsed = Date.now() - noValidSeenAt;
            if (elapsed >= NO_VALID_SUBMISSIONS_FAIL_MS) throw new Error(`"No valid submissions to Grade" persisted too long.`);
            throw new Error('Waiting for valid submission...');
        } else {
            noValidSeenAt = null;
        }

        const generateBtn = powerGraderPage.locator('button').filter({ hasText: "Generate Compatible Rubric" });
        if (await generateBtn.isVisible()) {
            if (!rubricGenerateClicked) {
                rubricGenerateClicked = true;
                await generateBtn.click();
            }
            throw new Error('Waiting for rubric generation...');
        }

        const startBtn = powerGraderPage.locator('button').filter({ hasText: /^Start Reviewing$/i });
        if (await startBtn.isVisible({ timeout: 10000 })) {
            await startBtn.click();
        } else {
            throw new Error('Waiting for "Start Reviewing" button...');
        }
    }).toPass({ timeout: 10 * 60 * 1000, intervals: [INTERVAL] });

    // PHASE 3: Grading Validation & Snapshot Capture
    const gradingPage = new PowerGraderGradingPage(powerGraderPage);

    await expect(async () => {
        console.log(`[${uniqueTitle}] Grading Page: Verifying AI results...`);
        try {
            await gradingPage.waitForLoad();
            await gradingPage.verifyGradesAndFeedbackPopulated();
        } catch (error) {
            await powerGraderPage.reload({ waitUntil: 'networkidle' });
            throw error;
        }
    }).toPass({ timeout: 180000, intervals: [15000] });

    const finalScoreRaw = await gradingPage.getTotalScore();
    const finalScore = Number(String(finalScoreRaw).match(/[\d.]+/)?.[0] ?? "0");
    const gradingSummary: any = await gradingPage.getGradingSummary();

    // ✅ Captured here so it is available for all logic branches below
    const currentSnapshot = {
        totalScore: finalScore,
        criteria: (gradingSummary?.criteria ?? []).map((c: any) => ({
            name: c.name,
            score: c.points, 
            feedback: c.feedback ?? "",
        })),
        overallFeedback: gradingSummary?.overallFeedback || "No overall feedback recorded."
    };

 

    // CASE 1: 'NO RUBRIC' TESTS
    if (uniqueTitle.toLowerCase().includes("no rubric")) {
        console.log(`[${uniqueTitle}] ℹ️ 'No Rubric' test detected. Saving to baseline.`);
        createBaseline(assignmentKey, currentSnapshot);

        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: currentSnapshot, 
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 1, 
        });

        await gradingPage.logGradingReport();
        await gradingPage.clickPublishButton();
        return;
    }

    // CASE 2: NEW BASELINE (FIRST RUN)
    if (!baselineExists(assignmentKey)) {
        console.log(`[${uniqueTitle}] No baseline found → writing baseline.`);
        createBaseline(assignmentKey, currentSnapshot);

        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: currentSnapshot,
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 1,
        });
        return;
    }

    // CASE 3: COMPARISON RUN
    const baselineData = loadBaseline(assignmentKey);
    const baselineSnapshot = baselineData.snapshot;

    const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);
    /*if (totalScoreDiff > 0.01) {
        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: baselineSnapshot,
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 0,
        });
        throw new Error(`❌ TOTAL SCORE MISMATCH: Baseline ${baselineSnapshot.totalScore} vs Current ${currentSnapshot.totalScore}`); 
    }*/

    if (totalScoreDiff > 0.01) {
        // 1. Write the run JSON so the dashboard knows a run happened
        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: baselineSnapshot,
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 0,
        });

        // 2. Publish the individual feedback to Allure BEFORE throwing the error
        // This is what fills the "N/A" in your Deep-Dive modal
        await AllureHelper.attachText('student-feedback', JSON.stringify({
            criterion_name: currentSnapshot.criteria[0]?.name || "Description of criterion",
            criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
            total_score: currentSnapshot.totalScore
        }));

        console.log(`📡 [PUBLISH] Feedback attached. Now throwing mismatch error...`);

        // 3. Finally, throw the error to fail the test
        throw new Error(`❌ TOTAL SCORE MISMATCH: Baseline ${baselineSnapshot.totalScore} vs Current ${currentSnapshot.totalScore}`); 
    }

    // Final Comparison & Drift Analysis
    const result = await compareRubricSnapshots(baselineSnapshot, currentSnapshot);
    
    writeLatestRunJson({
        uniqueTitle,
        assignmentKey,
        baselineSnapshot: baselineSnapshot,
        currentSnapshot: currentSnapshot,
        sbertSimilarity: result?.overallFeedback?.similarity ?? 0,
    });

        const DRIFT_THRESHOLD = 85; 
        if (result.summary.maxConfidencePct > DRIFT_THRESHOLD) {
            const driftMsg = `❌ DRIFT DETECTED: ${result.summary.worstField} has ${result.summary.maxConfidencePct.toFixed(1)}% drift.`;
            await AllureHelper.attachText("SBERT Drift Failure", driftMsg);
            throw new Error(driftMsg); 
        }

        console.log(`[${uniqueTitle}] ✅ VERIFIED: Scores match exactly and drift is within ${DRIFT_THRESHOLD}%.`);

        if (teacherEdits?.criteria?.length) {
            const criteriaCount = gradingSummary.criteria.length;
            const validEdits = teacherEdits.criteria.filter(
                (e) => e.criterionIndex >= 0 && e.criterionIndex < criteriaCount
            );
            if (validEdits.length > 0) {
                console.log(`[${uniqueTitle}] Teacher edit: applying ${validEdits.length} edit(s) (${criteriaCount} criteria on page)...`);
                await gradingPage.applyTeacherEdits(validEdits);
            }
        }
        
        await gradingPage.clickPublishButton();
        console.log(`[${uniqueTitle}] Waiting for redirect to Assignment Details...`);

        // PHASE 4: Final Confirmation
        await powerGraderPage.waitForURL(/.*assignments\/RegisterAssignment.*/, { timeout: 30000 });
        const allReviewedBtn = powerGraderPage.locator('button').filter({ hasText: /Submissions Reviewed|All Reviewed/i });
        await expect(allReviewedBtn).toBeVisible({ timeout: 90000 });
        console.log(`[${uniqueTitle}] Redirect successful.`);

        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
        console.log(`✅ [FINISH] Total Sync successful after ${duration} minutes.`);
    }

async function pollForStartReviewing(page: Page, uniqueTitle: string) {
    const startBtn = page.locator('button').filter({ hasText: /^Start Reviewing$/i });
    const timeoutMs = 10 * 60 * 1000;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) return;
        await page.waitForTimeout(5000);
        await page.reload({ waitUntil: 'networkidle' });
    }
    throw new Error(`[${uniqueTitle}] Timed out polling for "Start Reviewing"`);
}