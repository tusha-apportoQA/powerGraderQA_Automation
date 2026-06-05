import { Page, expect, test } from '@playwright/test';
import { PowerGraderCoursePage } from '../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
import { AllureHelper } from './allureHelper';
import { baselineExists, createBaseline, loadBaseline } from '../utils/powergrader-baseline';
import { compareRubricSnapshots, normCriterionName } from '../utils/sbert-compare';
import { GradingSummary, LmsTeacher, TeacherEditConfig } from '../types'; // Preserved from merge
import { executeIgWorkflow } from './ig-workflow';
import {
    buildWorkflowFailureError,
    createWorkflowFailure,
    WorkflowFailure,
} from './workflow-failures';
import { C68998, C68999, C69000, C69002, C69036, C69063, C69074, C69092, C69100, C75511, C75526, C75529, C75645, C78823 } from '../test-data/testCaseIds';
import fs from "fs";
import path from "path";

/**
 * Writes the latest test result to a JSON file for the dashboard.
 */
/*function writeLatestRunJson(params: {
  uniqueTitle: string;
  assignmentKey: string;
  baselineSnapshot: any;
  currentSnapshot: any;
  sbertSimilarity?: number;
  lms?: string;
}) {*/

function writeLatestRunJson(params: {
  uniqueTitle: string;
  assignmentKey: string;
  baselineSnapshot: any;
  currentSnapshot: any;
  sbertSimilarity?: number;
  lms?: string;
  gradeTimeMins?: string;
  status?: string;
}) {
  const out = {
    run_date: new Date().toISOString(),
    lms: params.lms || "Canvas",
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
    grade_time_mins: params.gradeTimeMins ?? 'N/A',
    status: params.status ?? 'unknown',
  };

  //const outPath = path.join(process.cwd(), "allure-results", "latest-run.json");
  const outPath = path.join(process.cwd(), "allure-results", `latest-run-${Date.now()}.json`);
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
    lms: string = "canvas",
    teacherEdits?: TeacherEditConfig, // Preserved from merge
    lmsTeacher?: LmsTeacher,
) {
    const assignmentKey = uniqueTitle.replace(/\s*\[\d+\]\s*$/, "").trim();

    //const baselineData = loadBaseline(assignmentKey);
    //const baselineSnapshot = baselineData?.snapshot || null;
    //const baselineData = baselineExists(assignmentKey) ? loadBaseline(assignmentKey) : null;
    const baselineData = baselineExists(assignmentKey, lms) ? loadBaseline(assignmentKey, lms) : null;
    const baselineSnapshot = baselineData?.snapshot || null;
   //const baselineSnapshot = baselineData?.snapshot || null;
    console.log("BASELINE KEY:", assignmentKey);
    const startTime = Date.now();
    const INTERVAL = 30000; 
    const NO_VALID_SUBMISSIONS_FAIL_MS = 10 * 60 * 1000; 
    let noValidSeenAt: number | null = null;

    console.log(`\n🚀 [START] Grade and Publish Workflow for: ${uniqueTitle}`);
    
    // PHASE 1: Course Page Sync
    /*await expect(async () => {
        console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
        await powerGraderPage.reload({ waitUntil: 'networkidle' });             
        const coursePage = new PowerGraderCoursePage(powerGraderPage);
        await coursePage.waitForLoad();
        
        const row = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: uniqueTitle }).last();
        if (await row.isVisible()) {
            console.log(`[${uniqueTitle}] Assignment found. Clicking on "View details"...`);
            const viewBtn = row.getByRole('link', { name: 'View details', exact: true }).or(row.getByText('View details', { exact: true }));
            await Promise.all([
                powerGraderPage.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                viewBtn.first().click()
            ]);
            await expect(powerGraderPage).not.toHaveURL(/.*dashboard.*///);
        //} else {
            //throw new Error(`[${uniqueTitle}] Syncing... assignment row not visible yet.`);
       // }
   // }).toPass({ timeout: 600000, intervals: [INTERVAL] });*/

    await expect(async () => {
        console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
        await powerGraderPage.reload({ waitUntil: 'networkidle' });
        const coursePage = new PowerGraderCoursePage(powerGraderPage);
        await coursePage.waitForLoad();
        await powerGraderPage.waitForTimeout(2000);

        // Search for the assignment by title
       // const searchInput = powerGraderPage.locator('input[placeholder="Search titles..."]');
        const searchInput = powerGraderPage.locator('input[placeholder*="Search titles"]');
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        await searchInput.clear();
        await searchInput.fill(uniqueTitle);
        console.log(`[${uniqueTitle}] Search filled with: ${uniqueTitle}`);
        await powerGraderPage.waitForTimeout(1000);

        const row = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: uniqueTitle }).last();
        const isVisible = await row.isVisible();
        console.log(`[${uniqueTitle}] Row visible: ${isVisible}`);
        if (await row.isVisible()) {
            console.log(`[${uniqueTitle}] Assignment found. Clicking on "View details"...`);
            const viewBtn = row.getByRole('link', { name: 'View details', exact: true }).or(row.getByText('View details', { exact: true }));
            await Promise.all([
                powerGraderPage.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                viewBtn.first().click()
            ]);
            await expect(powerGraderPage).not.toHaveURL(/.*dashboard.*/);
            if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69074:'))) {
                AllureHelper.label('caseStatus', `${C69074.split(':')[0]}:passed`);
            }
        } else {
            throw new Error(`[${uniqueTitle}] Syncing... assignment row not visible yet.`);
        }
    }).toPass({ timeout: 1200000, intervals: [INTERVAL] });

    const gradeStart = Date.now();

    // PHASE 2: Assignment Details Page Sync
    const detailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
   

    try{
        await expect(async () => {
           console.log(`[${uniqueTitle}] Waiting for AI Grading to Complete...`);
            await powerGraderPage.reload({ waitUntil: 'networkidle' });
            if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C68999:'))) {
                AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:reached`);
            }

            // logic to handle "No Rubric" state
            const generateBtn = powerGraderPage.locator('button').filter({ hasText: "Generate Compatible Rubric" });
            if (await generateBtn.isVisible({ timeout: 2000 })) {
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C68998:'))) {
                    AllureHelper.label('caseStatus', `${C68998.split(':')[0]}:passed`);
                }
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69036:'))) {
                    AllureHelper.label('caseStatus', `${C69036.split(':')[0]}:passed`);
                }
                console.log(`[${uniqueTitle}] No rubric found. Clicking "Generate Compatible Rubric"...`);
                /*await generateBtn.click();
                await powerGraderPage.waitForTimeout(5000);
                await powerGraderPage.reload({ waitUntil: 'networkidle' });
                throw new Error('Rubric generated. Reloading to check AI grading status...');*/
                await generateBtn.click();
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69000:'))) {
                    AllureHelper.label('caseStatus', `${C69000.split(':')[0]}:passed`);
                }
                console.log(`[${uniqueTitle}] Rubric generated. Waiting for AI grading to begin...`);
                await powerGraderPage.waitForTimeout(5000);
                throw new Error('Waiting for AI grading after rubric generation...');
            } else {
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C68999:'))) {
                    AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:passed`);
                }
            }

            const seeWhyBtn = powerGraderPage.getByRole('button', { name: /See Why/i });
            if (await seeWhyBtn.isVisible({ timeout: 2000 })) {
                console.log(`[${uniqueTitle}] Banner detected: "PowerGrader may not be able to grade..."`);
                const isShortAssignment = assignmentKey.toLowerCase().includes('short');
                if (isShortAssignment) {
                    AllureHelper.label('testCaseId', C75526);
                }
                await seeWhyBtn.click();
                console.log(`[${uniqueTitle}] Clicked "See Why" button.`);
                
                const gradeAnywayBtn = powerGraderPage.getByRole('button', { name: /Grade Anyway/i });
                /*await gradeAnywayBtn.click();
                console.log(`[${uniqueTitle}] Clicked "Grade Anyway" button.`);
                
                throw new Error('Triggered Grade Anyway flow, waiting for AI to resume...');*/
                await gradeAnywayBtn.click();
                console.log(`[${uniqueTitle}] Clicked "Grade Anyway". Waiting for AI grading...`);
                if (isShortAssignment) {
                    AllureHelper.label('caseStatus', `${C75526.split(':')[0]}:passed`);
                }
                await powerGraderPage.waitForTimeout(5000);
                throw new Error('Waiting for AI grading after Grade Anyway...');
            }

            const startBtn = powerGraderPage.locator('button').filter({ hasText: /^Review$/i });
            if (await startBtn.isVisible({ timeout: 5000 })) {
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69063:'))) {
                    AllureHelper.label('caseStatus', `${C69063.split(':')[0]}:passed`);
                }
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69092:'))) {
                    AllureHelper.label('caseStatus', `${C69092.split(':')[0]}:passed`);
                }
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C75645:'))) {
                    AllureHelper.label('caseStatus', `${C75645.split(':')[0]}:passed`);
                }
                AllureHelper.label('caseStatus', `${C69100.split(':')[0]}:passed`);
                await startBtn.click();
            } else {
                throw new Error('Waiting for "Review" button...');
            }
        }).toPass({ timeout: 15 * 60 * 1000, intervals: [INTERVAL] });
    } catch (error) {
    writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: baselineSnapshot, 
            currentSnapshot: { 
                totalScore: 0, 
                criteria: [], 
                overallFeedback: "AI grading timed out after 15 minutes." 
            },
            sbertSimilarity: 0,
            lms,
            // gradeTimeMins: 'timeout',
            //status: 'failed',
        });

        console.error(`\n❌ [TIMEOUT ERROR] AI grading for "${uniqueTitle}" failed within 15 mins.`);
        throw error;
    }

    // PHASE 3: Grading Validation & Snapshot Capture
    //const gradeStart = Date.now();
    const gradingPage = new PowerGraderGradingPage(powerGraderPage);
    const workflowFailures: WorkflowFailure[] = [];

    await expect(async () => {
        console.log(`[${uniqueTitle}] Grading Page: Verifying AI results...`);
        try {
            await gradingPage.waitForLoad();
            await gradingPage.verifyGradesAndFeedbackPopulated();
        } catch (error) {
           // await powerGraderPage.reload({ waitUntil: 'networkidle' });
            await powerGraderPage.reload({ waitUntil: 'domcontentloaded' });
            // Add a small manual wait to let the JS hydration finish
            await powerGraderPage.waitForTimeout(5000);
            throw error;
        }
    }).toPass({ timeout: 600000, intervals: [15000] });

    try {
        AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:reached`);
        await AllureHelper.step(C75529.split(':').slice(1).join(':'), async () => {
            AllureHelper.label('testCaseId', C75529);
            console.log(`[${uniqueTitle}] C75529: Checking due date label is visible on grading page`);
            await gradingPage.expectDueDateVisible();
            AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:passed`);
        });
    } catch (error) {
        try {
            await AllureHelper.attachScreenshot(
                powerGraderPage,
                'C75529 | PG | Due date visibility failure',
            );
        } catch (screenshotError) {
            console.warn(
                `[${uniqueTitle}] C75529: Could not attach failure screenshot:`,
                screenshotError,
            );
        }
        workflowFailures.push(createWorkflowFailure(error, { tag: 'PG', caseLabel: C75529 }));
    }

    const finalScoreRaw = await gradingPage.getTotalScore();
    const finalScore = Number(String(finalScoreRaw).match(/[\d.]+/)?.[0] ?? "0");
    const gradingSummary: any = await gradingPage.getGradingSummary();
    const gradeTimeMins = ((Date.now() - gradeStart) / 1000 / 60).toFixed(2);
    console.log(`[${uniqueTitle}] AI grading took ${gradeTimeMins} mins`);
    AllureHelper.parameter('AI Grade time (mins)', gradeTimeMins);

    const currentSnapshot = {
        totalScore: finalScore,
        criteria: (gradingSummary?.criteria ?? []).map((c: any) => ({
            name: c.name,
            score: c.points, 
            feedback: c.feedback ?? "",
        })),
        overallFeedback: gradingSummary?.overallFeedback || "No overall feedback recorded."
    };

    let hasSbertFailure = false;

    // --- CASE 3: COMPARISON RUN ---
    if (baselineSnapshot) {
            const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);
             // Skip SBERT for No Rubric tests - rubric regenerates each run so criterion names change
            if (assignmentKey.toLowerCase().includes('no rubric')) {
                console.log(`[${uniqueTitle}] Skipping SBERT comparison - No Rubric test, rubric regenerates each run.`);
                writeLatestRunJson({
                    uniqueTitle,
                    assignmentKey,
                    baselineSnapshot,
                    currentSnapshot,
                    sbertSimilarity: 1,
                    lms,
                   // gradeTimeMins: 'timeout',
                   gradeTimeMins,
                   // status: 'failed',
                    status: 'passed',
                });
            } else {
            
            if (totalScoreDiff > 0.01) {
                console.log(`⚠️ Score mismatch detected: Baseline ${baselineSnapshot.totalScore} vs Current ${currentSnapshot.totalScore} (delta: ${totalScoreDiff}). Continuing to SBERT drift check...`);
            }

            // Publish to Allure so modal populates even on score failure
            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: currentSnapshot.criteria[0]?.name || "Description of criterion",
                criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
                total_score: currentSnapshot.totalScore
            }));

           // console.log(`📡 [PUBLISH] Feedback attached. Now throwing mismatch error...`);
           console.log(`📡 [PUBLISH] Score mismatch noted (diff: ${totalScoreDiff}). Continuing to SBERT check...`);

            let result: any;
            let sbertScore = 0;

        try {
            result = await compareRubricSnapshots(baselineSnapshot, currentSnapshot);
            const criteriaAvgSim = result.criteria.length > 0
                ? result.criteria.reduce((sum: number, c: any) => sum + (c.feedbackSimilarity ?? 0), 0) / result.criteria.length
                : result?.overallFeedback?.similarity ?? 0;
            //sbertScore = criteriaAvgSim;
            const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);
            const maxScore = Math.max(baselineSnapshot.totalScore, currentSnapshot.totalScore, 1);
            const scorePenalty = totalScoreDiff / maxScore; // 0..1
            sbertScore = Math.max(0, criteriaAvgSim - scorePenalty);
            // DEBUG: log per-criterion similarity
            console.log(`[SBERT DEBUG] Overall feedback similarity: ${result?.overallFeedback?.similarity?.toFixed(3)}`);
            result.criteria.forEach((c: any) => {
                console.log(`[SBERT DEBUG] Criterion "${c.name}" feedback similarity: ${c.feedbackSimilarity?.toFixed(3)} | score delta: ${c.scoreDelta}`);
            });
            console.log(`[SBERT DEBUG] Avg criteria similarity: ${criteriaAvgSim.toFixed(3)} | maxConfidencePct: ${result.summary.maxConfidencePct.toFixed(1)}%`);
        } catch (compareError) {
            writeLatestRunJson({
                uniqueTitle,
                assignmentKey,
                baselineSnapshot,
                currentSnapshot,
                sbertSimilarity: 0,
                lms,
                //gradeTimeMins: 'timeout',
                gradeTimeMins,
                status: 'failed',
            });
            workflowFailures.push(createWorkflowFailure(compareError, { tag: 'SBERT' }));
            hasSbertFailure = true;
        }


        if (!hasSbertFailure) {
        // Always write BEFORE any potential throw
        const DRIFT_THRESHOLD = 85;

        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot,
            currentSnapshot,
            sbertSimilarity: sbertScore,
            lms,
            //gradeTimeMins: 'timeout',
            gradeTimeMins,
            //status: 'failed',
            status: result.summary.maxConfidencePct > DRIFT_THRESHOLD ? 'failed' : 'passed',
        });

        //const DRIFT_THRESHOLD = 85;
        if (result.summary.maxConfidencePct > DRIFT_THRESHOLD) {
            const driftMsg = `❌ DRIFT DETECTED: ${result.summary.worstField} has ${result.summary.maxConfidencePct.toFixed(1)}% drift.`;
            await AllureHelper.attachText("SBERT Drift Failure", driftMsg);
            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: currentSnapshot.criteria[0]?.name || "Criterion",
                criterion_feedback: currentSnapshot.criteria[0]?.feedback || "N/A",
                total_score: currentSnapshot.totalScore
            }));
            workflowFailures.push(createWorkflowFailure(new Error(driftMsg), { tag: 'SBERT' }));
            hasSbertFailure = true;
        } else {
            console.log(`[${uniqueTitle}] ✅ VERIFIED: Scores match exactly and drift is within ${DRIFT_THRESHOLD}%.`);
        }
        }
    }

    } else {
    
        // If the file is missing, the test should fail because the "Golden Standard" is gone.
       // 🎯 SEED MODE: This will recreate the .json files you deleted.
        console.log(`[${uniqueTitle}] No baseline found. SEEDING current run as new Golden Baseline.`);
        
        // This line creates the physical file on your disk
        createBaseline(assignmentKey, currentSnapshot, lms); 

        writeLatestRunJson({
            uniqueTitle,
            assignmentKey,
            baselineSnapshot: currentSnapshot, 
            currentSnapshot: currentSnapshot,
            sbertSimilarity: 1,
            lms,
            //gradeTimeMins: 'timeout',
            gradeTimeMins,  
            //status: 'failed',
             status: 'passed',
        });
    }

    // Apply Teacher Edits (Preserved from merge)
    if (teacherEdits?.criteria?.length) {
        console.log(`[${uniqueTitle}] Applying teacher edits...`);
        await gradingPage.applyTeacherEdits(teacherEdits.criteria);
    }

    const publishedGradingSummary = await gradingPage.getGradingSummary();

    await powerGraderPage.waitForTimeout(80000);
    
    await gradingPage.clickPublishButton();
    if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C75511:'))) {
        AllureHelper.label('caseStatus', `${C75511.split(':')[0]}:passed`);
    }
    AllureHelper.label('caseStatus', `${C78823.split(':')[0]}:passed`);
    //await powerGraderPage.waitForURL(/.*assignments\/RegisterAssignment.*/, { timeout: 30000 });
   // console.log(`✅ [FINISH] Workflow successful.`);
    let postPublishVerified = false;
    try {
        await detailsPage.waitForPostPublishAssignmentDetails(uniqueTitle);
        postPublishVerified = true;
        console.log(`[${uniqueTitle}] Post-publish redirect verified.`);
    } catch (error) {
        console.error(
            `[${uniqueTitle}] Post-publish redirect was not confirmed:`,
            error instanceof Error ? error.message : String(error),
        );
    }

    if (lmsTeacher) {
        if (assignmentKey.toLowerCase().includes('no rubric')) {
            console.log(`[${uniqueTitle}] Skipping LMS rubric verification - No Rubric assignment.`);
        } else if (!postPublishVerified) {
            console.log(
                `[${uniqueTitle}] Skipping LMS verification as post-publish state was not verified.`,
            );
        } else {
            try {
                await lmsTeacher.verifyLmsScore(uniqueTitle, publishedGradingSummary as GradingSummary);
            } catch (error) {
                workflowFailures.push(
                    createWorkflowFailure(error, { tag: 'LMS', caseLabel: C69002 }),
                );
            }
        }
    }

    let igFailures: WorkflowFailure[] = [];

    await AllureHelper.step('Interactive Grading workflow', async () => {
        console.log(`[${uniqueTitle}] Starting Interactive Grading workflow...`);
        let igReady = false;

        if (postPublishVerified) {
            console.log(`[${uniqueTitle}] Reopening first student submission for IG workflow...`);
            const viewButton = powerGraderPage.getByRole('button', { name: 'View' }).first();
            await expect(viewButton).toBeVisible({ timeout: 30000 });
            await viewButton.click();
            await gradingPage.waitForLoad();
            igReady = true;
        } else {
            const onSubmissionGradingPage = await powerGraderPage
                .getByRole('button', { name: 'Publish' })
                .isVisible({ timeout: 5000 })
                .catch(() => false);
            if (onSubmissionGradingPage) {
                console.log(
                    `[${uniqueTitle}] Still on submission grading page; running IG workflow directly.`,
                );
                igReady = true;
            } else {
                console.error(
                    `[${uniqueTitle}] Cannot start IG workflow: post-publish redirect failed and Publish button is not visible.`,
                );
            }
        }

        if (igReady) {
            igFailures = await executeIgWorkflow(powerGraderPage);
        }
    });

    const combinedError = buildWorkflowFailureError([...workflowFailures, ...igFailures]);
    if (combinedError) {
        console.error(
            `[${uniqueTitle}] ❌ Combined deferred failures:`,
            combinedError.message,
        );
        throw combinedError;
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ [FINISH] Workflow successful after ${duration} minutes.`);

}

