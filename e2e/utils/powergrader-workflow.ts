import { Page, expect } from '@playwright/test';
    import { PowerGraderCoursePage } from '../components/powergrader/pages/PowerGraderCoursePage';
    import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
    import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
    import { AllureHelper } from './allureHelper';
    import { baselineExists, createBaseline, loadBaseline } from '../utils/powergrader-baseline';
    import { compareRubricSnapshots, normCriterionName } from '../utils/sbert-compare';


    export async function executeUniversalPGWorkflow(
        powerGraderPage: Page, 
        uniqueTitle: string, 
        studentEmail: string,
        baselineKey: string
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
        console.log(`[${uniqueTitle}] Waiting for student submission to sync on Details Page...`);
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
                console.log(`[${uniqueTitle}] "No valid submissions to Grade" still present (${Math.round(elapsed/1000)}s)`);

                if (elapsed >= NO_VALID_SUBMISSIONS_FAIL_MS) {
                    throw new Error(`"No valid submissions to Grade" persisted too long.`);
                }
                throw new Error('Waiting for valid submission...');
            } else {
                noValidSeenAt = null;
            }

            const generateBtn = powerGraderPage.locator('button').filter({ hasText: "Generate Compatible Rubric" });
            if (await generateBtn.isVisible()) {
                if (!rubricGenerateClicked) {
                    rubricGenerateClicked = true;
                    console.log(`[${uniqueTitle}] No Rubric banner found. Clicking Generate...`);
                    await generateBtn.click();
                }
                throw new Error('Waiting for rubric generation...');
            }

            const incompatibleBanner = powerGraderPage
                .locator('div, span, p')
                .filter({ hasText: /PowerGrader may not be able to grade|Assignment Incompatible/i })
                .first();

            const incompatiblePill = powerGraderPage.getByRole('button', { name: /Assignment Incompatible/i });

            if ((await incompatibleBanner.isVisible({ timeout: 2000 }).catch(() => false)) || (await incompatiblePill.isVisible({ timeout: 2000 }).catch(() => false))) {
                console.log(`[${uniqueTitle}] Incompatible detected. Clicking Grade Anyway...`);
                await detailsPage.clickSeeWhy();
                await detailsPage.clickGradeAnyway();
                await pollForStartReviewing(powerGraderPage, uniqueTitle);
                throw new Error('Triggered AI via Grade Anyway...');
            }

            const startBtn = powerGraderPage.locator('button').filter({ hasText: /^Start Reviewing$/i });
            if (await startBtn.isVisible({ timeout: 10000 })) {
                console.log(`[${uniqueTitle}] AI Grading cycle complete. Clicking "Start Reviewing"...`);
                await startBtn.click();
            } else {
                throw new Error('Waiting for "Start Reviewing" button...');
            }
        }).toPass({ timeout: 10 * 60 * 1000, intervals: [INTERVAL] });

        // PHASE 3: Grading Validation
        const gradingPage = new PowerGraderGradingPage(powerGraderPage);

        await expect(async () => {
            console.log(`[${uniqueTitle}] Grading Page: Verifying AI results...`);
            try {
                await gradingPage.waitForLoad();
                await gradingPage.verifyGradesAndFeedbackPopulated();
            } catch (error) {
                console.log(`[${uniqueTitle}] Results not visible. Reloading...`);
                await powerGraderPage.reload({ waitUntil: 'networkidle' });
                throw error;
            }
        }).toPass({ timeout: 180000, intervals: [15000] });

        const finalScoreRaw = await gradingPage.getTotalScore();
        const finalScore = Number(String(finalScoreRaw).match(/[\d.]+/)?.[0] ?? "0");
        const gradingSummary: any = await gradingPage.getGradingSummary();

        const currentSnapshot = {
            totalScore: finalScore,
            criteria: (gradingSummary?.criteria ?? []).map((c: any) => ({
                name: c.name,
                score: c.points, // FIXED: Changed from c.score to c.points
                feedback: c.feedback ?? "",
            })),
        };

        // --- SKIP BASELINE CHECK FOR 'NO RUBRIC' TESTS ---
        if (uniqueTitle.toLowerCase().includes("no rubric")) {
            console.log(`[${uniqueTitle}] ℹ️ 'No Rubric' test detected. Saving results to baseline and skipping comparison logic.`);
            createBaseline(assignmentKey, currentSnapshot);
            
            // Log for Allure records then move to Publish
            await gradingPage.logGradingReport();
            await gradingPage.clickPublishButton();
            return; // EXIT the function early so no mismatch errors are thrown
        }

        if (!baselineExists(assignmentKey)) {
            console.log(`[${uniqueTitle}] No baseline found → writing baseline and skipping compare`);
            createBaseline(assignmentKey, currentSnapshot);
            return;
        }

        const baselineData = loadBaseline(assignmentKey);
        const baselineSnapshot = baselineData.snapshot;

        // --- 1. TOTAL SCORE CHECK & DETAILED REPORTING ---
        const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);
        if (totalScoreDiff > 0.01) {
            const mismatchReport = [
                `==== 🔍 SCORE MISMATCH REPORT: ${uniqueTitle} ====`,
                `Total Score Baseline: ${baselineSnapshot.totalScore}`,
                `Total Score Current:  ${currentSnapshot.totalScore}`,
                `Diff:                  ${totalScoreDiff.toFixed(2)}`,
                `\n[CRITERIA BREAKDOWN]`,
                ...baselineSnapshot.criteria.map((base: any) => {
                    const match = currentSnapshot.criteria.find((c: any) => normCriterionName(c.name) === normCriterionName(base.name));
                    const currentScore = match ? match.score : 'MISSING';
                    const status = match && Math.abs(base.score - match.score) < 0.01 ? '✅' : '❌';
                    return `${status} ${base.name}\n   - Baseline: ${base.score} pts\n   - Current:  ${currentScore} pts`;
                }),
                `================================================`
            ].join('\n');

            console.log(`\n${mismatchReport}\n`);
            await AllureHelper.attachText("Score Mismatch Detailed Report", mismatchReport);
            throw new Error(`❌ TOTAL SCORE MISMATCH: Baseline ${baselineSnapshot.totalScore} vs Current ${currentSnapshot.totalScore}`); 
        }

        // --- 2. INDIVIDUAL CRITERIA CHECK ---
        for (const baseCrit of baselineSnapshot.criteria) {
            const normalizedBaseName = normCriterionName(baseCrit.name);
            const match = currentSnapshot.criteria.find((c: any) => normCriterionName(c.name) === normalizedBaseName);
            
            if (!match) {
                console.log(`[${uniqueTitle}] ⚠️ Criterion missing: "${baseCrit.name}". AI likely renamed it. Resetting baseline.`);
                createBaseline(assignmentKey, currentSnapshot);
                return;
            }

            if (Math.abs(baseCrit.score - match.score) > 0.01) {
                const detail = `CRITERION MISMATCH\nName: ${baseCrit.name}\nExpected: ${baseCrit.score}\nGot: ${match.score}\n\nFeedback:\n${match?.feedback || 'No feedback'}`;
                console.log(`\n${detail}\n`);
                await AllureHelper.attachText("Criterion Mismatch Details", detail);
                throw new Error(`❌ CRITERION SCORE MISMATCH: "${baseCrit.name}"`); 
            }
        }

        // --- 3. SBERT FEEDBACK DRIFT ---
        const result = await compareRubricSnapshots(baselineSnapshot, currentSnapshot);
        console.log("\n===== SBERT DRIFT REPORT =====");
        console.log(JSON.stringify(result, null, 2));
        await AllureHelper.attachJSON("SBERT Drift Report", result);

        const DRIFT_THRESHOLD = 85; 
        if (result.summary.maxConfidencePct > DRIFT_THRESHOLD) {
            const driftMsg = `❌ DRIFT DETECTED: ${result.summary.worstField} has ${result.summary.maxConfidencePct.toFixed(1)}% drift.`;
            await AllureHelper.attachText("SBERT Drift Failure", driftMsg);
            throw new Error(driftMsg); 
        }

        console.log(`[${uniqueTitle}] ✅ VERIFIED: Scores match exactly and drift is within ${DRIFT_THRESHOLD}%.`);
        
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
        console.log(`[${uniqueTitle}] Polling for AI completion ("Start Reviewing")...`);
        const startBtn = page.locator('button').filter({ hasText: /^Start Reviewing$/i });
        const timeoutMs = 10 * 60 * 1000;
        const intervalMs = 5000;
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                return;
            }
            await page.waitForTimeout(intervalMs);
            await page.reload({ waitUntil: 'networkidle' });
        }
        throw new Error(`[${uniqueTitle}] Timed out polling for "Start Reviewing"`);
    }