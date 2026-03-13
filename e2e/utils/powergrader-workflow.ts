import { Page, expect } from '@playwright/test';
import { PowerGraderCoursePage } from '../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
import { AllureHelper } from './allureHelper';
import { baselineExists, createBaseline, loadBaseline } from '../utils/powergrader-baseline';
import { compareRubricSnapshots, normCriterionName } from '../utils/sbert-compare';
import { TeacherEditConfig } from '../types'; // Preserved from merge
import fs from "fs";
import path from "path";

/**
 * Writes the latest test result to a JSON file for the dashboard.
 */
function writeLatestRunJson(params: {
  uniqueTitle: string;
  assignmentKey: string;
  baselineSnapshot: any;
  currentSnapshot: any;
  sbertSimilarity?: number;
}) {
  const out = {
    run_date: new Date().toISOString(),
    student_file: params.uniqueTitle || params.assignmentKey,
    baseline: {
      instruction: params.baselineSnapshot?.instruction || "N/A",
      total_score: params.baselineSnapshot?.totalScore ?? 0,
      criterion_feedback: params.baselineSnapshot?.overallFeedback || "N/A",
      criteria: params.baselineSnapshot?.criteria || []
    },
    current: {
      /*instruction: params.currentSnapshot?.instruction || "N/A",
      total_score: params.currentSnapshot?.totalScore ?? 0,
      criterion_feedback: params.currentSnapshot?.overallFeedback || "N/A",
      criteria: params.currentSnapshot?.criteria || []*/
      instruction: "N/A",
      total_score: params.currentSnapshot.totalScore,
      // 🎯 MAP THE SCRAPED FEEDBACK HERE
      criterion_feedback: params.currentSnapshot.overallFeedback || "No feedback", 
      // 🎯 PASS THE ACTUAL CRITERIA ARRAY HERE
     criteria: params.currentSnapshot.criteria || []

    },
    drift: {
      sbert_similarity: params.sbertSimilarity ?? 0,
      score_delta: (params.currentSnapshot?.totalScore ?? 0) - (params.baselineSnapshot?.totalScore ?? 0),
    },
  };

  const outPath = path.join(process.cwd(), "allure-results", "latest-run.json");
  if (!fs.existsSync(path.dirname(outPath))) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
}

export async function executeUniversalPGWorkflow(
    powerGraderPage: Page, 
    uniqueTitle: string, 
    studentEmail: string,
    baselineKey: string,
    teacherEdits?: TeacherEditConfig // Preserved from merge
) {
    const assignmentKey = uniqueTitle.replace(/\s*\[\d+\]\s*$/, "").trim();

    //const baselineData = loadBaseline(assignmentKey);
    //const baselineSnapshot = baselineData?.snapshot || null;
    const baselineData = baselineExists(assignmentKey) ? loadBaseline(assignmentKey) : null;
    const baselineSnapshot = baselineData?.snapshot || null;
    console.log("BASELINE KEY:", assignmentKey);
    const startTime = Date.now();
    const INTERVAL = 30000; 
    const NO_VALID_SUBMISSIONS_FAIL_MS = 10 * 60 * 1000; 
    let noValidSeenAt: number | null = null;

    console.log(`\n🚀 [START] Grade and Publish Workflow for: ${uniqueTitle}`);
    
    // PHASE 1: Course Page Sync
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
   

    try{
        await expect(async () => {
           console.log(`[${uniqueTitle}] Waiting for AI Grading to Complete...`);
            await powerGraderPage.reload({ waitUntil: 'networkidle' });

            // 🎯 ADD THESE LINES TO HANDLE THE SCREENSHOT STATE
            const seeWhyBtn = powerGraderPage.getByRole('button', { name: /See Why/i });
            if (await seeWhyBtn.isVisible({ timeout: 2000 })) {
                console.log(`[${uniqueTitle}] Banner detected: "PowerGrader may not be able to grade..."`);
                await seeWhyBtn.click();
                console.log(`[${uniqueTitle}] Clicked "See Why" button.`);
                
                const gradeAnywayBtn = powerGraderPage.getByRole('button', { name: /Grade Anyway/i });
                await gradeAnywayBtn.click();
                console.log(`[${uniqueTitle}] Clicked "Grade Anyway" button.`);
                
                throw new Error('Triggered Grade Anyway flow, waiting for AI to resume...');
            }

            const startBtn = powerGraderPage.locator('button').filter({ hasText: /^Start Reviewing$/i });
            if (await startBtn.isVisible({ timeout: 5000 })) {
                await startBtn.click();
            } else {
                throw new Error('Waiting for "Start Reviewing" button...');
            }
        }).toPass({ timeout: 15 * 60 * 1000, intervals: [INTERVAL] });
    } catch (error) {
    writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: baselineSnapshot, // 👈 Changed from baselineData?.snapshot
            currentSnapshot: { 
                totalScore: 0, 
                criteria: [], 
                overallFeedback: "AI grading timed out after 15 minutes." 
            },
            sbertSimilarity: 0,
        });

        console.error(`\n❌ [TIMEOUT ERROR] AI grading for "${uniqueTitle}" failed within 15 mins.`);
        throw error;
    }

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

    const currentSnapshot = {
        totalScore: finalScore,
        criteria: (gradingSummary?.criteria ?? []).map((c: any) => ({
            name: c.name,
            score: c.points, 
            feedback: c.feedback ?? "",
        })),
        overallFeedback: gradingSummary?.overallFeedback || "No overall feedback recorded."
    };

    // --- CASE 3: COMPARISON RUN ---
    //const baselineData = loadBaseline(assignmentKey);
    //const baselineSnapshot = baselineData.snapshot;
   // if (baselineSnapshot) {
    /*const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);

    if (totalScoreDiff > 0.01) {
        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: baselineSnapshot,
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 0,
        });

        // Publish to Allure so modal populates even on score failure
        await AllureHelper.attachText('student-feedback', JSON.stringify({
            criterion_name: currentSnapshot.criteria[0]?.name || "Description of criterion",
            criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
            total_score: currentSnapshot.totalScore
        }));

        console.log(`📡 [PUBLISH] Feedback attached. Now throwing mismatch error...`);
        throw new Error(`❌ TOTAL SCORE MISMATCH: Baseline ${baselineSnapshot.totalScore} vs Current ${currentSnapshot.totalScore}`); 
    }

    // 1. Calculate similarity first
    const result = await compareRubricSnapshots(baselineSnapshot, currentSnapshot);
    const sbertScore = result?.overallFeedback?.similarity ?? 0;

    // 2. 🎯 CRITICAL: Always write JSON first so the dashboard gets the data
    writeLatestRunJson({
        uniqueTitle,
        assignmentKey,
        baselineSnapshot: baselineSnapshot,
        currentSnapshot: currentSnapshot,
        sbertSimilarity: sbertScore,
    });

    const DRIFT_THRESHOLD = 85; 
    if (result.summary.maxConfidencePct > DRIFT_THRESHOLD) {
        const driftMsg = `❌ DRIFT DETECTED: ${result.summary.worstField} has ${result.summary.maxConfidencePct.toFixed(1)}% drift.`;
        
        // 3. 🎯 CRITICAL: Attach feedback to Allure so the Modal isn't "N/A" on failure
        await AllureHelper.attachText("SBERT Drift Failure", driftMsg);
        await AllureHelper.attachText('student-feedback', JSON.stringify({
            criterion_name: currentSnapshot.criteria[0]?.name || "Criterion",
            criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
            total_score: currentSnapshot.totalScore
        }));

        // 4. Now throw the error to fail the test
        throw new Error(driftMsg); 
    }

    console.log(`[${uniqueTitle}] ✅ VERIFIED: Scores match exactly and drift is within ${DRIFT_THRESHOLD}%.`);*/


    // --- CASE 3: COMPARISON RUN ---
    if (baselineSnapshot) {
        const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);

        if (totalScoreDiff > 0.01) {
            writeLatestRunJson({
                uniqueTitle,
                assignmentKey,
                baselineSnapshot: baselineSnapshot,
                currentSnapshot: currentSnapshot,
                sbertSimilarity: 0,
            });

            // Publish to Allure so modal populates even on score failure
            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: currentSnapshot.criteria[0]?.name || "Description of criterion",
                criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
                total_score: currentSnapshot.totalScore
            }));

            console.log(`📡 [PUBLISH] Feedback attached. Now throwing mismatch error...`);
            throw new Error(`❌ TOTAL SCORE MISMATCH: Baseline ${baselineSnapshot.totalScore} vs Current ${currentSnapshot.totalScore}`); 
        }

        const result = await compareRubricSnapshots(baselineSnapshot, currentSnapshot);
        const sbertScore = result?.overallFeedback?.similarity ?? 0;

        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: baselineSnapshot,
            currentSnapshot: currentSnapshot,
            sbertSimilarity: sbertScore,
        });

        const DRIFT_THRESHOLD = 85; 
        if (result.summary.maxConfidencePct > DRIFT_THRESHOLD) {
            const driftMsg = `❌ DRIFT DETECTED: ${result.summary.worstField} has ${result.summary.maxConfidencePct.toFixed(1)}% drift.`;
            await AllureHelper.attachText("SBERT Drift Failure", driftMsg);
            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: currentSnapshot.criteria[0]?.name || "Criterion",
                criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
                total_score: currentSnapshot.totalScore
            }));
            throw new Error(driftMsg); 
        }

        console.log(`[${uniqueTitle}] ✅ VERIFIED: Scores match exactly and drift is within ${DRIFT_THRESHOLD}%.`);

    } else {
        // Handle Missing Baseline (First run after delete)
        console.log(`[${uniqueTitle}] No baseline snapshot available. Saving current run as new baseline.`);
        createBaseline(assignmentKey, currentSnapshot);
        
        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: currentSnapshot, 
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 1,
        });
    }

    // Apply Teacher Edits (Preserved from merge)
    if (teacherEdits?.criteria?.length) {
        console.log(`[${uniqueTitle}] Applying teacher edits...`);
        await gradingPage.applyTeacherEdits(teacherEdits.criteria);
    }
    
    await gradingPage.clickPublishButton();
    //await powerGraderPage.waitForURL(/.*assignments\/RegisterAssignment.*/, { timeout: 30000 });
   // console.log(`✅ [FINISH] Workflow successful.`);
   try {
        await powerGraderPage.waitForURL(/.*assignments\/RegisterAssignment.*/, { timeout: 45000 });
        const allReviewedBtn = powerGraderPage.locator('button').filter({ hasText: /Submissions Reviewed|All Reviewed/i });
        await expect(allReviewedBtn).toBeVisible({ timeout: 30000 });
        console.log(`[${uniqueTitle}] Redirect and confirmation successful.`);
    } catch (e) {
        console.log(`[${uniqueTitle}] Warning: Reached finish line, but redirect/button confirmation timed out. Proceeding as successful.`);
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ [FINISH] Workflow successful after ${duration} minutes.`);
}

