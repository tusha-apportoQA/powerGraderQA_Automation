import { expect, Page } from '@playwright/test';
import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
import {
    POW957,
    POW966,
    POW967,
    POW968,
    POW980,
    POW970,
    POW969,
    POW971,
    POW972,
    POW978,
    POW984,
    POW991,
    POW992,
    POW986,
} from '../test-data/testCaseIds';
import { AllureHelper } from './allureHelper';
import { gradingSummariesMatch } from './grading-summary';
import { createWorkflowFailure, WorkflowFailure } from './workflow-failures';

function caseTitle(caseLabel: string): string {
    return caseLabel.split(':').slice(1).join(':');
}

function caseId(caseLabel: string): string {
    return caseLabel.split(':')[0];
}

async function clickCancelIfVisible(page: Page): Promise<void> {
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    if (await cancelButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('[IG Workflow] Closing customize sidebar (Cancel)...');
        await cancelButton.click();
        await page.waitForTimeout(300);
    }
}

async function waitForPreviewCleared(
    gradingPage: PowerGraderGradingPage,
    context: string,
): Promise<void> {
    console.log(`[IG Workflow] Waiting for Preview mode to disappear ${context}...`);
    await expect(
        gradingPage.previewModeLabel,
        `Preview mode did not disappear ${context}`,
    ).toBeHidden({ timeout: 50000 });

    console.log(
        `[IG Workflow] Waiting for main Interactive regrade button to be visible and enabled ${context}...`,
    );
    await expect(
        gradingPage.interactiveRegradeButton,
        `Main Interactive regrade button is not visible ${context}`,
    ).toBeVisible({ timeout: 50000 });
    await expect(
        gradingPage.interactiveRegradeButton,
        `Main Interactive regrade button did not become enabled ${context}`,
    ).toBeEnabled({ timeout: 50000 });
}

async function clickDiscardIfVisible(gradingPage: PowerGraderGradingPage): Promise<void> {
    if (await gradingPage.discardButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('[IG Workflow] Cleanup: clicking Discard...');
        await gradingPage.discardButton.click();
        await gradingPage.page.waitForTimeout(500);
        await waitForPreviewCleared(gradingPage, 'after Discard');
    }
}

/**
 * Interactive grading workflow. All UI actions go through {@link PowerGraderGradingPage}.
 * Blocking cases fail the test immediately. Non-blocking cases use try/catch; returned
 * {@link WorkflowFailure} list should be merged by the caller after publish/LMS (orchestration).
 */
export async function executeIgWorkflow(page: Page): Promise<WorkflowFailure[]> {
    const failures: WorkflowFailure[] = [];

    const workflowStart = Date.now();
    console.log('[IG Workflow] 🚀 START Interactive Grading workflow');

    const gradingPage = new PowerGraderGradingPage(page);
    const cancelButton = page.getByRole('button', { name: 'Cancel' });

    // POW957 — blocking : Verify 'Customize' Visibility (Header)
    console.log(`[IG Workflow] ▶ ${caseId(POW957)}: ${caseTitle(POW957)}`);
    AllureHelper.label('testCaseId', POW957);
    await expect(
        gradingPage.interactiveRegradeButton,
        'Interactive regrade button is not visible',
    ).toBeVisible({ timeout: 30000 });
    AllureHelper.label('caseStatus', `${caseId(POW957)}:passed`);
    console.log(`[IG Workflow] ✅ ${caseId(POW957)} PASSED`);

    // POW986 — non-blocking: strictness options visible in IG sidebar
    try {
        await AllureHelper.step(caseTitle(POW986), async () => {
            console.log(`[IG Workflow] ▶ ${caseId(POW986)}: ${caseTitle(POW986)}`);
            AllureHelper.label('testCaseId', POW986);
            console.log('[IG Workflow] Opening main Interactive regrade sidebar...');
            await gradingPage.interactiveRegradeButton.click();
            await page.waitForTimeout(500);

            await expect(
                page.getByRole('button', { name: 'More Strict' }),
                'More Strict button is not visible',
            ).toBeVisible({ timeout: 30000 });
            await expect(
                page.getByRole('button', { name: 'More Lenient' }),
                'More Lenient button is not visible',
            ).toBeVisible({ timeout: 30000 });
            AllureHelper.label('caseStatus', `${caseId(POW986)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW986)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW986, page }));
    } finally {
        await clickCancelIfVisible(page);
    }

    // POW971 — non-blocking: customize opens per criterion
    try {
        await AllureHelper.step(caseTitle(POW971), async () => {
            console.log(`[IG Workflow] ▶ ${caseId(POW971)}: ${caseTitle(POW971)}`);
            AllureHelper.label('testCaseId', POW971);
            const criterionSections = page.locator('div.overflow-visible.rounded-lg.shadow-sm');
            await expect(criterionSections.first()).toBeVisible({ timeout: 30000 });

            const criterionCount = await criterionSections.count();
            console.log(`[IG Workflow] Checking customize panel per criterion (${criterionCount} total)...`);
            for (let i = 0; i < criterionCount; i++) {
                await page.waitForTimeout(1000);
                const section = criterionSections.nth(i);
                const criterionName = (
                    await section.locator('h3.text-lg.font-semibold.text-gray-900').innerText()
                ).trim();

                const criterionIgButton = section.getByRole('button', { name: 'Interactive regrade' });
                await expect(
                    criterionIgButton,
                    `Interactive regrade button not visible for "${criterionName}"`,
                ).toBeVisible({ timeout: 30000 });
                console.log(
                    `[IG Workflow] Criterion ${i + 1}/${criterionCount}: "${criterionName}" — opening Interactive regrade...`,
                );
                await criterionIgButton.click();
                await page.waitForTimeout(500);

                const criterionNameLabels = page.getByText(criterionName, { exact: true });
                await expect(
                    criterionNameLabels.nth(1),
                    `Customize panel not visible for "${criterionName}" (expected second name label)`,
                ).toBeVisible({ timeout: 30000 });

                if (await cancelButton.isVisible({ timeout: 1500 }).catch(() => false)) {
                    await cancelButton.click();
                    await page.waitForTimeout(300);
                }
            }

            AllureHelper.label('caseStatus', `${caseId(POW971)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW971)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW971, page }));
    } finally {
        await clickCancelIfVisible(page);
    }

    const firstCriterionIndex = 0;

    // POW972 — non-blocking: per-criterion IG generate + apply changes that criterion
    try {
        await AllureHelper.step(caseTitle(POW972), async () => {
            console.log(`[IG Workflow] ▶ ${caseId(POW972)}: ${caseTitle(POW972)}`);
            AllureHelper.label('testCaseId', POW972);
            const section = page
                .locator('div.overflow-visible.rounded-lg.shadow-sm')
                .nth(firstCriterionIndex);
            const criterionName = (
                await section.locator('h3.text-lg.font-semibold.text-gray-900').innerText()
            ).trim();

            const criterionIgButton = section.getByRole('button', { name: 'Interactive regrade' });
            await expect(
                criterionIgButton,
                `Interactive regrade button not visible for "${criterionName}"`,
            ).toBeVisible({ timeout: 30000 });

            const currentSummary = await gradingPage.getGradingSummary();
            const criterionBefore = currentSummary.criteria[firstCriterionIndex];
            console.log(
                `[IG Workflow] Per-criterion IG for "${criterionName}" (index ${firstCriterionIndex}), total: ${currentSummary.totalScore}`,
            );

            await clickDiscardIfVisible(gradingPage);
            await gradingPage.generateIG({ criterionIndex: firstCriterionIndex });

            console.log('[IG Workflow] Applying interactive grade (Apply → Apply Only Here)...');
            await gradingPage.applyButton.click();
            await page.waitForTimeout(500);

            const applyOnlyHereButton = page.getByRole('button', { name: 'Apply Only Here' });
            await expect(applyOnlyHereButton, 'Apply Only Here button is not visible').toBeVisible({
                timeout: 30000,
            });
            await applyOnlyHereButton.click();
            await page.waitForTimeout(500);
            await waitForPreviewCleared(gradingPage, 'after Apply Only Here');
            await page.waitForTimeout(3000);

            const criterionAfter = (await gradingPage.getGradingSummary()).criteria[firstCriterionIndex];
            console.log(
                `[IG Workflow] "${criterionName}" before apply — score: ${criterionBefore.points}`,
            );
            console.log(
                `[IG Workflow] "${criterionName}" after apply — score: ${criterionAfter.points}`,
            );

            const criterionChanged =
                criterionBefore.points !== criterionAfter.points ||
                criterionBefore.feedback.trim() !== criterionAfter.feedback.trim();
            if (!criterionChanged) {
                console.log(
                    `[IG Workflow] "${criterionName}" did not change after apply (score and feedback unchanged)`,
                );
            }

            expect(
                criterionChanged,
                `Score or feedback for "${criterionName}" should change after applying interactive grade`,
            ).toBe(true);
            AllureHelper.label('caseStatus', `${caseId(POW972)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW972)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW972, page }));
        await clickDiscardIfVisible(gradingPage);
    }

    console.log('[IG Workflow] Capturing baseline before main generateIG...');
    const summaryBeforeGenerate = await gradingPage.getGradingSummary();
    console.log(`[IG Workflow] Baseline total score: ${summaryBeforeGenerate.totalScore}`);

    // POW967 / POW968 / POW980 — non-blocking: preview persists after reload (navigation)
    try {
        await AllureHelper.step(caseTitle(POW967), async () => {
            console.log(`[IG Workflow] ▶ ${caseId(POW967)}: ${caseTitle(POW967)}`);
            AllureHelper.label('testCaseId', POW967);
            console.log(`[IG Workflow] ▶ ${caseId(POW968)}: ${caseTitle(POW968)}`);
            AllureHelper.label('testCaseId', POW968);
            console.log(`[IG Workflow] ▶ ${caseId(POW980)}: ${caseTitle(POW980)}`);
            AllureHelper.label('testCaseId', POW980);
            console.log('[IG Workflow] Main generateIG (More Lenient → More Encouraging → Generate)...');
            await clickDiscardIfVisible(gradingPage);
            await gradingPage.generateIG();

            try {
                await AllureHelper.step(caseTitle(POW970), async () => {
                    console.log(`[IG Workflow] ▶ ${caseId(POW970)}: ${caseTitle(POW970)}`);
                    AllureHelper.label('testCaseId', POW970);
                    const customScoreInput = page.locator('input[type="number"]').first();
                    await expect(
                        customScoreInput,
                        'Custom score input is not visible in Preview mode',
                    ).toBeVisible({ timeout: 30000 });
                    await expect(
                        customScoreInput,
                        'Custom score input should be disabled in Preview mode',
                    ).toBeDisabled({ timeout: 30000 });
                    AllureHelper.label('caseStatus', `${caseId(POW970)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(POW970)} PASSED`);
                });
            } catch (error) {
                failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW970, page }));
            }

            console.log('[IG Workflow] Reloading page to verify Preview mode persists...');
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForTimeout(500);
            await gradingPage.waitForLoad();

            await expect(
                gradingPage.previewModeLabel,
                'Preview mode not visible after reload',
            ).toBeVisible({ timeout: 30000 });
            AllureHelper.label('caseStatus', `${caseId(POW967)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW967)} PASSED`);
            AllureHelper.label('caseStatus', `${caseId(POW968)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW968)} PASSED`);
            AllureHelper.label('caseStatus', `${caseId(POW980)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW980)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW967, page }));
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW968 }));
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW980 }));
    }

    // POW966 — non-blocking: discard restores original grades
    try {
        await AllureHelper.step(caseTitle(POW966), async () => {
            console.log(`[IG Workflow] ▶ ${caseId(POW966)}: ${caseTitle(POW966)}`);
            AllureHelper.label('testCaseId', POW966);
            console.log('[IG Workflow] Clicking Discard to restore original grades...');
            await gradingPage.discardButton.click();
            await page.waitForTimeout(500);
            await waitForPreviewCleared(gradingPage, 'after Discard');
            await page.waitForTimeout(3000);

            const summaryAfterDiscard = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] After discard total score: ${summaryAfterDiscard.totalScore}`);

            const summariesMatch = gradingSummariesMatch(summaryBeforeGenerate, summaryAfterDiscard);
            if (summariesMatch) {
                console.log('[IG Workflow] Discard comparison OK — grades match baseline.');
            }

            expect(
                summariesMatch,
                'Grading summary changed after discarding interactive grade preview',
            ).toBe(true);
            AllureHelper.label('caseStatus', `${caseId(POW966)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW966)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW966, page }));
        await clickDiscardIfVisible(gradingPage);
    }

    // POW969 — non-blocking: apply flow and grades change after Apply Only Here
    try {
        await AllureHelper.step(caseTitle(POW969), async () => {
            await page.reload({ waitUntil: 'networkidle' });
            console.log(`[IG Workflow] ▶ ${caseId(POW969)}: ${caseTitle(POW969)}`);
            AllureHelper.label('testCaseId', POW969);
            const summaryBeforeApply = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] Before apply flow, total score: ${summaryBeforeApply.totalScore}`);

            console.log('[IG Workflow] generateIG for apply flow (More Lenient → More Encouraging → Generate)...');
            await clickDiscardIfVisible(gradingPage);
            await gradingPage.generateIG();
            await page.waitForTimeout(3000);
            const summaryInPreview = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] Preview total score: ${summaryInPreview.totalScore}`);

            console.log('[IG Workflow] Opening Apply modal...');
            await gradingPage.applyButton.click();
            await page.waitForTimeout(500);

            const applyToAllButton = page.getByRole('button', { name: 'Apply to All' });
            const applyOnlyHereButton = page.getByRole('button', { name: 'Apply Only Here' });

            try {
                await AllureHelper.step(caseTitle(POW991), async () => {
                    console.log(`[IG Workflow] ▶ ${caseId(POW991)}: ${caseTitle(POW991)}`);
                    AllureHelper.label('testCaseId', POW991);
                    await expect(applyToAllButton, 'Apply to All button is not visible').toBeVisible({
                        timeout: 30000,
                    });
                    await expect(applyOnlyHereButton, 'Apply Only Here button is not visible').toBeVisible({
                        timeout: 30000,
                    });
                    AllureHelper.label('caseStatus', `${caseId(POW991)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(POW991)} PASSED`);
                });
            } catch (error) {
                failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW991, page }));
            }

            try {
                await AllureHelper.step(caseTitle(POW992), async () => {
                    console.log(`[IG Workflow] ▶ ${caseId(POW992)}: ${caseTitle(POW992)}`);
                    AllureHelper.label('testCaseId', POW992);
                    console.log('[IG Workflow] Clicking Apply Only Here...');
                    await applyOnlyHereButton.click();
                    await page.waitForTimeout(500);
                    await waitForPreviewCleared(gradingPage, 'after Apply Only Here');
                    await page.waitForTimeout(3000);
                    AllureHelper.label('caseStatus', `${caseId(POW992)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(POW992)} PASSED`);
                });
            } catch (error) {
                failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW992, page }));
            }

            const summaryAfterApply = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] After Apply Only Here, total score: ${summaryAfterApply.totalScore}`);

            try {
                await AllureHelper.step(caseTitle(POW984), async () => {
                    console.log(`[IG Workflow] ▶ ${caseId(POW984)}: ${caseTitle(POW984)}`);
                    AllureHelper.label('testCaseId', POW984);
                    const previewMatchesApplied = gradingSummariesMatch(
                        summaryInPreview,
                        summaryAfterApply,
                    );
                    if (previewMatchesApplied) {
                        console.log('[IG Workflow] Preview vs applied comparison OK.');
                    }

                    expect(
                        previewMatchesApplied,
                        'Applied grades should match preview-mode grades before Apply',
                    ).toBe(true);
                    AllureHelper.label('caseStatus', `${caseId(POW984)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(POW984)} PASSED`);
                });
            } catch (error) {
                failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW984, page }));
            }

            const differsFromBaseline = !gradingSummariesMatch(summaryBeforeApply, summaryAfterApply);
            if (differsFromBaseline) {
                console.log('[IG Workflow] Applied vs baseline comparison OK — grades differ as expected.');
            }

            expect(
                differsFromBaseline,
                'Grading summary should differ from original after applying interactive grade',
            ).toBe(true);
            AllureHelper.label('caseStatus', `${caseId(POW969)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW969)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW969, page }));
        await clickDiscardIfVisible(gradingPage);
    }

    const assignmentDetailsPage = new PowerGraderAssignmentDetailsPage(page);

    // POW978 — non-blocking: publish IG score persists after reopening submission
    try {
        await AllureHelper.step(caseTitle(POW978), async () => {
            console.log(`[IG Workflow] ▶ ${caseId(POW978)}: ${caseTitle(POW978)}`);
            AllureHelper.label('testCaseId', POW978);
            const summaryBeforePublish = await gradingPage.getGradingSummary();
            console.log(
                `[IG Workflow] Pre-publish total score: ${summaryBeforePublish.totalScore}`,
            );

            console.log('[IG Workflow] Publishing interactive grading score...');
            await gradingPage.clickPublishButton();
            await assignmentDetailsPage.waitForPostPublishAssignmentDetails('IG workflow');

            console.log('[IG Workflow] Reopening first student submission to verify published score...');
            const viewButton = page.getByRole('button', { name: 'View' }).first();
            await expect(viewButton).toBeVisible({ timeout: 30000 });
            await viewButton.click();
            await page.waitForTimeout(500);
            await gradingPage.waitForLoad();

            await AllureHelper.attachScreenshot(page, `${caseId(POW978)} | reopened after ig score publish`);

            const summaryAfterPublish = await gradingPage.getGradingSummary();
            console.log(
                `[IG Workflow] Post-reopen total score: ${summaryAfterPublish.totalScore}`,
            );

            const publishedScorePersisted = gradingSummariesMatch(
                summaryBeforePublish,
                summaryAfterPublish,
            );
            if (publishedScorePersisted) {
                console.log('[IG Workflow] Published IG score matches after reopening submission.');
            }

            expect(
                publishedScorePersisted,
                'Published grading summary should match pre-publish summary after reopening submission',
            ).toBe(true);
            AllureHelper.label('caseStatus', `${caseId(POW978)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(POW978)} PASSED`);
        });
    } catch (error) {
        failures.push(await createWorkflowFailure(error, { tag: 'IG', caseLabel: POW978, page }));
    }

    const durationMin = ((Date.now() - workflowStart) / 60000).toFixed(1);
    if (failures.length > 0) {
        console.warn(
            `[IG Workflow] ⚠️ FINISH with ${failures.length} failed ${failures.length === 1 ? 'failure' : 'failures'} (${durationMin} min) — caller should throw deferred error`,
        );
    } else {
        console.log(`[IG Workflow] ✅ FINISH Interactive Grading workflow (${durationMin} min)`);
    }
    return failures;
}
