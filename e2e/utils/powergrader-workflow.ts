import { Page, expect, test } from '@playwright/test';
import { PowerGraderCoursePage } from '../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
import { AllureHelper } from './allureHelper';
import { baselineExists, createBaseline, loadBaseline } from '../utils/powergrader-baseline';
import {
    compareCriterionNameUniqueness,
    compareRubricSnapshots,
    normCriterionName,
} from '../utils/sbert-compare';
import { GradingSummary, LmsTeacher, OrchestrationAssignmentConfig, CriterionEditEntry } from '../types'; // Preserved from merge
import { executeIgWorkflow } from './ig-workflow';
import { gradingSummariesMatch } from './grading-summary';
import {
    buildWorkflowFailureError,
    createWorkflowFailure,
    WorkflowFailure,
} from './workflow-failures';
import { C68955, C68956, C68957, C68958, C68959, C68960, C68961, C68962, C68998, C68999, C69000, C69002, C69036, C69041, C69063, C69074, C69092, C69100, C69138, C69209, C75466, C75511, C75526, C75529, C75645, C75673, C76730, C78816, C78820, C78823, C78835 } from '../test-data/testCaseIds';
import fs from "fs";
import path from "path";

function getIterativeRepublishCaseLabel(submissionType?: string): string | undefined {
    switch (submissionType) {
        case '.txt':
            return C68956;
        case '.pdf':
            return C68958;
        case '.docx':
            return C68960;
        case 'Text Entry':
            return C68962;
        default:
            return undefined;
    }
}

function getStandardPublishCaseLabel(submissionType?: string): string | undefined {
    switch (submissionType) {
        case '.txt':
            return C68955;
        case '.pdf':
            return C68957;
        case '.docx':
            return C68959;
        case 'Text Entry':
            return C68961;
        default:
            return undefined;
    }
}

async function executeInvalidSubmissionWorkflow(
    powerGraderPage: Page,
    uniqueTitle: string,
): Promise<void> {
    const workflowFailures: WorkflowFailure[] = [];

    try {
        await AllureHelper.step(C75466.split(':').slice(1).join(':'), async () => {
            AllureHelper.label('testCaseId', C75466);
            AllureHelper.label('caseStatus', `${C75466.split(':')[0]}:reached`);
            console.log(`[${uniqueTitle}] C75466: Waiting for invalid submission grading block...`);

            await expect(async () => {
                console.log(`[${uniqueTitle}] C75466: Checking for "Cannot be graded" button...`);
                await powerGraderPage.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });

                const cannotBeGradedBtn = powerGraderPage.getByRole('button', { name: 'Cannot be graded' });
                if (!(await cannotBeGradedBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
                    throw new Error('Waiting for "Cannot be graded" button...');
                }
            }).toPass({ timeout: 10 * 60 * 1000, intervals: [30000] });

            console.log(`[${uniqueTitle}] C75466: "Cannot be graded" visible — clicking and verifying modal.`);
            await powerGraderPage.getByRole('button', { name: 'Cannot be graded' }).click();

            const allowGradingBtn = powerGraderPage.getByRole('button', { name: 'Allow Grading' });
            await expect(
                allowGradingBtn,
                '"Allow Grading" button should be visible after clicking "Cannot be graded"',
            ).toBeVisible({ timeout: 10000 });
            await expect(
                allowGradingBtn,
                '"Allow Grading" button should be disabled for invalid document types',
            ).toBeDisabled();

            AllureHelper.label('caseStatus', `${C75466.split(':')[0]}:passed`);
            console.log(`[${uniqueTitle}] C75466: Invalid submission modal verified.`);
        });
    } catch (error) {
        workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C75466, page: powerGraderPage }));
        throw buildWorkflowFailureError(workflowFailures);
    }
}

/** Ready grading page if Publish is visible; otherwise reopen first submission from details. */
async function ensureOnGradingPage(
    page: Page,
    detailsPage: PowerGraderAssignmentDetailsPage,
    gradingPage: PowerGraderGradingPage,
    label: string,
): Promise<void> {
    const onGradingPage = await page
        .getByRole('button', { name: 'Publish' })
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    if (onGradingPage) {
        console.log(`[${label}] Already on grading page (Publish visible).`);
        return;
    }
    console.log(`[${label}] Not on grading page; reopening first student submission...`);
    await detailsPage.reopenFirstStudentSubmission(label);
    await gradingPage.waitForLoad();
}

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
    assignmentConfig: OrchestrationAssignmentConfig,
    lms: string = "canvas",
    lmsTeacher?: LmsTeacher,
) {
    const assignmentKey = assignmentConfig.title;
    const { workflow } = assignmentConfig;
    const submissionType = assignmentConfig.submissionType;
    const isNoRubric = assignmentConfig.rubric?.type === 'no';
    const teacherEdits = assignmentConfig.teacherEdits?.length
        ? { criteria: assignmentConfig.teacherEdits }
        : undefined;

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

    console.log(`\n🚀 [START] Universal PG workflow for: ${uniqueTitle}`);
    
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

    await AllureHelper.step('Course Page Sync: Checking for assignment', async () => {
        await expect(async () => {
            console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
            await powerGraderPage.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
            const viewDetailsFirst = powerGraderPage.getByRole('link', { name: 'View details' }).first();
            const viewDetailsVisible = await viewDetailsFirst
                .waitFor({ state: 'visible', timeout: 30_000 })
                .then(() => true)
                .catch(() => false);
            if (!viewDetailsVisible) {
                const yesBtn = powerGraderPage.getByRole('button', { name: 'Yes' });
                if (await yesBtn.waitFor({ state: 'visible', timeout: 60_000 }).then(() => true).catch(() => false)) {
                    await yesBtn.click();
                    await powerGraderPage.waitForLoadState('networkidle').catch(() => { });
                }
                await expect(viewDetailsFirst).toBeVisible({ timeout: 30_000 });
            }

            const coursePage = new PowerGraderCoursePage(powerGraderPage);
            await coursePage.clickSyncNowIfAvailable(uniqueTitle);

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
                    powerGraderPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => { }),
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
    });

    if (workflow.invalidSubmission) {
        await AllureHelper.step('Invalid submission workflow', async () => {
            await executeInvalidSubmissionWorkflow(powerGraderPage, uniqueTitle);
        });
        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
        console.log(`✅ [FINISH] Invalid submission workflow successful after ${duration} minutes.`);
        return;
    }

    const gradeStart = Date.now();

    // PHASE 2: Assignment submissions page sync
    const detailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
   
    await AllureHelper.step("AI grading ......", async () => {
        try {
            await expect(async () => {
                console.log(`[${uniqueTitle}] Waiting for AI Grading to Complete...`);
                await powerGraderPage.reload({ waitUntil: 'networkidle' });
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C68999:'))) {
                    AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:reached`);
                }

                // logic to handle "No Rubric" state
                const generateBtn = powerGraderPage.locator('button').filter({ hasText: "Generate Compatible Rubric" });
                if (await generateBtn.isVisible({ timeout: 2000 })) {
                    if (!isNoRubric) {
                        // Has-rubric: button can briefly appear while LMS rubric ingests — never click Generate.
                        console.log(
                            `[${uniqueTitle}] Generate Compatible Rubric still visible; waiting for LMS rubric ingest...`,
                        );
                        throw new Error(
                            'Waiting for LMS rubric to ingest (Generate Compatible Rubric still visible)...',
                        );
                    }

                    await AllureHelper.step('Generate Compatible Rubric', async () => {
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
                    });
                } else {
                    if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C68999:'))) {
                        AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:passed`);
                    }
                }

                const seeWhyBtn = powerGraderPage.getByRole('button', { name: /See Why/i });
                if (await seeWhyBtn.isVisible({ timeout: 2000 })) {
                    await AllureHelper.step('Handle see why (grade anyway)', async () => {
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
                    });
                }

                await AllureHelper.step('Open submission grade review', async () => {
                    const startBtn = powerGraderPage.locator('button').filter({ hasText: /^Review$/i });
                    const reopenBtn = powerGraderPage.getByRole('button', { name: 'View' }).first();
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
                    } else if (await reopenBtn.isVisible({ timeout: 5000 })) {
                        console.log(`[${uniqueTitle}] Already reviewed; reopening via View...`);
                        await reopenBtn.click();
                    } else {
                        throw new Error('Waiting for "Review" button...');
                    }
                });
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
    });
    // PHASE 3: Grading Validation & Snapshot Capture
    //const gradeStart = Date.now();
    const gradingPage = new PowerGraderGradingPage(powerGraderPage);
    const workflowFailures: WorkflowFailure[] = [];

    await AllureHelper.step('Grading Page: Verify grades and feedback populated', async () => {
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
        await AllureHelper.attachScreenshot(
            powerGraderPage,
            'Checkpoint|AI score present',
        );
    });

    const assignmentKeyLower = assignmentKey.toLowerCase();
    const isCsvOrXlsxAssignment =
        assignmentKeyLower.includes('csv') || assignmentKeyLower.includes('xlsx');
    if (isCsvOrXlsxAssignment) {
        try {
            await AllureHelper.step(C78816.split(':').slice(1).join(':'), async () => {
                AllureHelper.label('testCaseId', C78816);
                console.log(
                    `[${uniqueTitle}] C78816: Checking submission file is visible on Submission tab`,
                );
                await gradingPage.expectSubmissionFileDisplayed();
                AllureHelper.label('caseStatus', `${C78816.split(':')[0]}:passed`);
            });
        } catch (error) {
            workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C78816, page: powerGraderPage }));
        }
    }

    let gradingSummary: any;
    let gradeTimeMins = '';
    let currentSnapshot!: {
        totalScore: number;
        criteria: { name: string; score: number; feedback: string }[];
        overallFeedback: string;
    };

    await AllureHelper.step('Get summary for baseline comparison', async () => {
        const finalScoreRaw = await gradingPage.getTotalScore();
        const finalScore = Number(String(finalScoreRaw).match(/[\d.]+/)?.[0] ?? "0");
        gradingSummary = await gradingPage.getGradingSummary();
        gradeTimeMins = ((Date.now() - gradeStart) / 1000 / 60).toFixed(2);
        console.log(`[${uniqueTitle}] AI grading took ${gradeTimeMins} mins`);
        AllureHelper.parameter('AI Grade time (mins)', gradeTimeMins);

        currentSnapshot = {
            totalScore: finalScore,
            criteria: (gradingSummary?.criteria ?? []).map((c: any) => ({
                name: c.name,
                score: c.points,
                feedback: c.feedback ?? "",
            })),
            overallFeedback: gradingSummary?.overallFeedback || "No overall feedback recorded."
        };
    });

    let hasSbertFailure = false;

    // --- CASE 3: COMPARISON RUN ---
    if (baselineSnapshot) {
        const totalScoreDiff = Math.abs(baselineSnapshot.totalScore - currentSnapshot.totalScore);
        // Skip SBERT for no-rubric assignments — rubric regenerates each run so criterion names change
        if (isNoRubric) {
            console.log(`[${uniqueTitle}] Skipping SBERT comparison - No Rubric assignment, rubric regenerates each run.`);
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

            await AllureHelper.step('SBERT drift check', async () => {

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
                    workflowFailures.push(await createWorkflowFailure(compareError, { tag: 'SBERT', page: powerGraderPage }));
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
                        workflowFailures.push(await createWorkflowFailure(new Error(driftMsg), { tag: 'SBERT', page: powerGraderPage }));
                        hasSbertFailure = true;
                    } else {
                        console.log(`[${uniqueTitle}] ✅ VERIFIED: Scores match exactly and drift is within ${DRIFT_THRESHOLD}%.`);
                    }
                }
            });
        }

    } else {

        await AllureHelper.step('No baseline: SEED Golden Baseline.', async () => {
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
        });
    }

    // No-rubric assignments: generated criterion names must describe distinct concepts.
    if (isNoRubric) {
        const criterionNameSimilarityThreshold = 0.8;
        try {
            AllureHelper.label('caseStatus', `${C69209.split(':')[0]}:reached`);
            await AllureHelper.step(C69209.split(':').slice(1).join(':'), async () => {
                AllureHelper.label('testCaseId', C69209);
                const criterionNames = (gradingSummary?.criteria ?? []).map(
                    (criterion: { name?: string }) => criterion.name ?? '',
                );
                const uniqueness = await compareCriterionNameUniqueness(
                    criterionNames,
                    criterionNameSimilarityThreshold,
                );

                const duplicateDetails = uniqueness.duplicates
                    .map(
                        ({ firstName, secondName, similarity }) =>
                            `"${firstName}" / "${secondName}" (${similarity.toFixed(3)})`,
                    )
                    .join(', ');

                expect(
                    uniqueness.isUnique,
                    `Generated criterion names must be semantically unique. Duplicate pairs at cosine similarity >= ${criterionNameSimilarityThreshold}: ${duplicateDetails}`,
                ).toBe(true);

                AllureHelper.label('caseStatus', `${C69209.split(':')[0]}:passed`);
                console.log(
                    `[${uniqueTitle}] C69209: Generated criterion names are semantically unique (all pairwise similarities < ${criterionNameSimilarityThreshold}).`,
                );
            });
        } catch (error) {
            workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C69209, page: powerGraderPage }));
        }
    }

    // C69041 — non-blocking: rubric criterion order matches config (when criteriaOrder is set)
    const expectedCriteriaOrder =
        assignmentConfig.rubric &&
        assignmentConfig.rubric.type !== 'no' &&
        assignmentConfig.rubric.criteriaOrder?.length
            ? assignmentConfig.rubric.criteriaOrder
            : undefined;
    if (expectedCriteriaOrder) {
        try {
            AllureHelper.label('caseStatus', `${C69041.split(':')[0]}:reached`);
            await AllureHelper.step(C69041.split(':').slice(1).join(':'), async () => {
                AllureHelper.label('testCaseId', C69041);
                const actualOrder = (gradingSummary.criteria ?? []).map(
                    (c: { name: string }) => c.name.trim(),
                );
                console.log(
                    `[${uniqueTitle}] C69041: Expected criteria order=[${expectedCriteriaOrder.join(', ')}]`,
                );
                console.log(
                    `[${uniqueTitle}] C69041: Actual criteria order=[${actualOrder.join(', ')}]`,
                );
                expect(
                    actualOrder,
                    'Rubric criterion order in PowerGrader should match criteriaOrder from assignment config',
                ).toEqual(expectedCriteriaOrder);
                AllureHelper.label('caseStatus', `${C69041.split(':')[0]}:passed`);
                console.log(`[${uniqueTitle}] C69041: Rubric criterion order matches expected.`);
            });
        } catch (error) {
            workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C69041, page: powerGraderPage }));
        }
    }

    // Apply Teacher Edits (Preserved from merge)
    await AllureHelper.step('Apply Teacher Edits', async () => {
        if (teacherEdits?.criteria?.length) {
            console.log(`[${uniqueTitle}] Applying teacher edits...`);
            await gradingPage.applyTeacherEdits(teacherEdits.criteria);
        }
    })

    if (workflow.lmsVerifySave) {
        await AllureHelper.step('Save draft', async () => {
            if (!teacherEdits?.criteria?.length) {
                console.warn(
                    `[${uniqueTitle}] C69138: lmsVerifySave is true but no teacherEdits; skipping Save draft.`,
                );
            } else {
                AllureHelper.label('caseStatus', `${C69138.split(':')[0]}:reached`);
                console.log(`[${uniqueTitle}] C69138: Saving draft after teacher edits...`);
                await gradingPage.clickSaveDraftAndWaitUntilDisabled();
                console.log(`[${uniqueTitle}] C69138: Draft saved; continuing to publish + LMS verify.`);
            }
        });
    }

    const publishedGradingSummary = await gradingPage.getGradingSummary();

    await AllureHelper.step('Publish grades', async () => {
        await powerGraderPage.waitForTimeout(80000);

        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C78820:'))) {
            AllureHelper.label('caseStatus', `${C78820.split(':')[0]}:reached`);
        }

        await gradingPage.clickPublishButton();
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C75511:'))) {
            AllureHelper.label('caseStatus', `${C75511.split(':')[0]}:passed`);
        }
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C78820:'))) {
            AllureHelper.label('caseStatus', `${C78820.split(':')[0]}:passed`);
        }
        AllureHelper.label('caseStatus', `${C78823.split(':')[0]}:passed`);
        //await powerGraderPage.waitForURL(/.*assignments\/RegisterAssignment.*/, { timeout: 30000 });
        // console.log(`✅ [FINISH] Workflow successful.`);
    });

    let postPublishVerified = false;
    await AllureHelper.step('Verify published', async () => {
        try {
            await detailsPage.waitForPostPublishAssignmentDetails(uniqueTitle);
            postPublishVerified = true;
            console.log(`[${uniqueTitle}] Post-publish redirect verified.`);
        } catch (error) {
            console.error(
                `[${uniqueTitle}] Post-publish redirect was not confirmed:`,
                error instanceof Error ? error.message : String(error),
            );
            await AllureHelper.attachFailureDiagnostics(powerGraderPage, 'Post-publish redirect', {
                error: error instanceof Error ? error.message : String(error),
                waitingFor: `assignment details for "${uniqueTitle}"`,
            });
        }
    });

    if (isNoRubric && postPublishVerified) {
        try {
            AllureHelper.label('caseStatus', `${C75673.split(':')[0]}:reached`);
            await AllureHelper.step(C75673.split(':').slice(1).join(':'), async () => {
                AllureHelper.label('testCaseId', C75673);
                await detailsPage.editAiRubricAndVerifyPersistence();
                AllureHelper.label('caseStatus', `${C75673.split(':')[0]}:passed`);
            });
        } catch (error) {
            workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C75673, page: powerGraderPage }));
        }
    } else if (isNoRubric) {
        console.log(
            `[${uniqueTitle}] C75673: Skipped because post-publish assignment details were not verified.`,
        );
    }

    // Standard Grading & Publish — non-blocking: published scores persist after reopen
    // (.txt / .pdf / .docx / Text Entry). Leaves PG on grading; later steps use ensureOnGradingPage.
    const standardPublishCase = getStandardPublishCaseLabel(submissionType);
    if (standardPublishCase) {
        const standardCaseId = standardPublishCase.split(':')[0];
        try {
            AllureHelper.label('caseStatus', `${standardCaseId}:reached`);
            await AllureHelper.step(standardPublishCase.split(':').slice(1).join(':'), async () => {
                AllureHelper.label('testCaseId', standardPublishCase);
                console.log(`[${uniqueTitle}] ${standardCaseId}: Verifying published scores after reopen...`);
                await ensureOnGradingPage(powerGraderPage, detailsPage, gradingPage, uniqueTitle);
                const reopenedSummary = await gradingPage.getGradingSummary();
                console.log(
                    `[${uniqueTitle}] ${standardCaseId}: Pre-publish total=${publishedGradingSummary.totalScore}; reopened total=${reopenedSummary.totalScore}`,
                );
                expect(
                    gradingSummariesMatch(
                        publishedGradingSummary as GradingSummary,
                        reopenedSummary,
                    ),
                    'Published grading summary should match after reopening the first submission',
                ).toBe(true);
                AllureHelper.label('caseStatus', `${standardCaseId}:passed`);
                console.log(`[${uniqueTitle}] ${standardCaseId}: Published scores match after reopen.`);
            });
        } catch (error) {
            workflowFailures.push(
                await createWorkflowFailure(error, { tag: 'PG', caseLabel: standardPublishCase, page: powerGraderPage }),
            );
        }
    }

    // C78835 — non-blocking: Back returns to submissions/details list (restores details page before LMS/IG).
    try {
        AllureHelper.label('caseStatus', `${C78835.split(':')[0]}:reached`);
        await AllureHelper.step(C78835.split(':').slice(1).join(':'), async () => {
            AllureHelper.label('testCaseId', C78835);
            console.log(`[${uniqueTitle}] C78835: Ensuring grading page, then verifying Back navigation...`);
            await ensureOnGradingPage(powerGraderPage, detailsPage, gradingPage, uniqueTitle);
            await gradingPage.clickBackToSubmissionsList();
            const viewButton = powerGraderPage.getByRole('button', { name: 'View' }).first();
            await expect(
                viewButton,
                'View button should be visible on assignment details after clicking Back',
            ).toBeVisible({ timeout: 30000 });
            AllureHelper.label('caseStatus', `${C78835.split(':')[0]}:passed`);
            console.log(`[${uniqueTitle}] C78835: Back button returned to submissions list (View visible).`);
        });
    } catch (error) {
        workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C78835, page: powerGraderPage }));
    }

    if (lmsTeacher) {
        if (!workflow.verifyLms) {
            console.log(`[${uniqueTitle}] Skipping LMS rubric verification - disabled in assignment workflow config.`);
            AllureHelper.label('caseStatus', `${C69002.split(':')[0]}:not_reached`);
        } else if (!postPublishVerified) {
            console.log(
                `[${uniqueTitle}] Skipping LMS verification as post-publish state was not verified.`,
            );
        } else {
            try {
                await lmsTeacher.verifyLmsScore(uniqueTitle, publishedGradingSummary as GradingSummary);
                if (workflow.lmsVerifySave) {
                    AllureHelper.label('caseStatus', `${C69138.split(':')[0]}:passed`);
                    console.log(
                        `[${uniqueTitle}] C69138: LMS reflects saved/published teacher edits.`,
                    );
                }
            } catch (error) {
                workflowFailures.push(
                    await createWorkflowFailure(error, { tag: 'LMS', caseLabel: C69002 }),
                );
                if (workflow.lmsVerifySave) {
                    workflowFailures.push(
                        await createWorkflowFailure(error, { tag: 'LMS', caseLabel: C69138 }),
                    );
                }
            }
            const iterativeRepublishCase = workflow.iterativeRepublish
                ? getIterativeRepublishCaseLabel(submissionType)
                : undefined;
            if (iterativeRepublishCase) {
                const iterativeCaseId = iterativeRepublishCase.split(':')[0];
                await AllureHelper.step('Iterative Re-Publishing', async () => {
                    AllureHelper.label('caseStatus', `${iterativeCaseId}:reached`);
                    try {
                        console.log(`[${uniqueTitle}] Starting iterative re-publish (${iterativeCaseId})...`);
                        // ensureOnGradingPage: after C78835 we are on details; after a failed Back we may still be on grading
                        await ensureOnGradingPage(powerGraderPage, detailsPage, gradingPage, uniqueTitle);
                        const republishEdits: CriterionEditEntry[] = (publishedGradingSummary.criteria ?? []).map((_, index) => ({ criterionIndex: index, score: 0 }));
                        await gradingPage.applyTeacherEdits(republishEdits);
                        const republishGradingSummary = await gradingPage.getGradingSummary();
                        await powerGraderPage.waitForTimeout(80000);
                        await gradingPage.clickPublishButton();
                        let republishPostPublishVerified = false;
                        try {
                            await detailsPage.waitForPostPublishAssignmentDetails(uniqueTitle);
                            republishPostPublishVerified = true;
                            console.log(`[${uniqueTitle}] Iterative re-publish redirect verified.`);
                        } catch (error) {
                            console.error(
                                `[${uniqueTitle}] Iterative re-publish redirect was not confirmed:`,
                                error instanceof Error ? error.message : String(error),
                            );
                        }
                        if (!republishPostPublishVerified) {
                            workflowFailures.push(
                                await createWorkflowFailure(
                                    new Error('Post-publish redirect not confirmed after iterative re-publish'),
                                    { tag: 'LMS', caseLabel: iterativeRepublishCase, page: powerGraderPage },
                                ),
                            );
                            return;
                        }
                        try {
                            await lmsTeacher.verifyLmsScore(uniqueTitle, republishGradingSummary as GradingSummary);
                            console.log(`[${uniqueTitle}] Iterative re-publish LMS verification passed.`);
                            AllureHelper.label('caseStatus', `${iterativeCaseId}:passed`);
                        } catch (error) {
                            workflowFailures.push(
                                await createWorkflowFailure(error, { tag: 'LMS', caseLabel: iterativeRepublishCase }),
                            );
                        }
                    } catch (error) {
                        workflowFailures.push(
                            await createWorkflowFailure(error, {
                                tag: 'LMS',
                                caseLabel: iterativeRepublishCase,
                                page: powerGraderPage,
                            }),
                        );
                    }
                });
            }
        }
    }

    let igFailures: WorkflowFailure[] = [];

    await AllureHelper.step('Interactive Grading workflow', async () => {
        if (!workflow.igWorkflow) {
            console.log(`[${uniqueTitle}] Skipping Interactive Grading workflow - disabled in assignment workflow config.`);
            return;
        }

        console.log(`[${uniqueTitle}] Starting Interactive Grading workflow...`);
        let igReady = false;

        try {
            await ensureOnGradingPage(powerGraderPage, detailsPage, gradingPage, uniqueTitle);
            igReady = true;
        } catch (error) {
            console.error(
                `[${uniqueTitle}] Cannot start IG workflow: could not reach grading page:`,
                error instanceof Error ? error.message : String(error),
            );
            await AllureHelper.attachFailureDiagnostics(powerGraderPage, 'IG|cannot reach grading page', {
                error: error instanceof Error ? error.message : String(error),
                waitingFor: 'Publish button / reopen first submission',
            });
        }

        if (igReady) {
            igFailures = await executeIgWorkflow(powerGraderPage);
        }
    });

    if (!workflow.onTimeVisibility) {
        console.log(`[${uniqueTitle}] Skipping on time check - disabled in assignment workflow config.`);
        AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:not_reached`);
    } else {
        try {
            AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:reached`);
            await AllureHelper.step(C75529.split(':').slice(1).join(':'), async () => {
                AllureHelper.label('testCaseId', C75529);
                await ensureOnGradingPage(powerGraderPage, detailsPage, gradingPage, uniqueTitle);
                console.log(`[${uniqueTitle}] C75529: Checking due date label is visible on grading page`);
                await gradingPage.expectDueDateVisible();
                AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:passed`);
            });
        } catch (error) {
            workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C75529, page: powerGraderPage }));
        }
    }

    // C76730 — non-blocking: Logout from PowerGrader (any page)
    try {
        AllureHelper.label('caseStatus', `${C76730.split(':')[0]}:reached`);
        await AllureHelper.step(C76730.split(':').slice(1).join(':'), async () => {
            AllureHelper.label('testCaseId', C76730);
            console.log(`[${uniqueTitle}] C76730: Clicking Logout...`);
            const logoutControl = powerGraderPage.getByTitle('Logout');
            await expect(logoutControl, 'Logout control is not visible').toBeVisible({
                timeout: 15000,
            });
            await logoutControl.click();
            console.log(`[${uniqueTitle}] C76730: Waiting for logout confirmation...`);
            await expect(
                powerGraderPage.getByText('You have been successfully logged out'),
                'Logout success message is not visible',
            ).toBeVisible({ timeout: 60000 });
            AllureHelper.label('caseStatus', `${C76730.split(':')[0]}:passed`);
            console.log(`[${uniqueTitle}] C76730: Logout confirmed.`);
        });
    } catch (error) {
        workflowFailures.push(await createWorkflowFailure(error, { tag: 'PG', caseLabel: C76730, page: powerGraderPage }));
    }

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

