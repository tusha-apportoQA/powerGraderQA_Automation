import { expect, Page } from '@playwright/test';
import { PowerGraderAssignmentDetailsPage } from '../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../components/powergrader/pages/PowerGraderGradingPage';
import {
    C68976,
    C68985,
    C68986,
    C68987,
    C68989,
    C69008,
    C69011,
    C69023,
    C69034,
    C69094,
    C69095,
    C69114,
    C75537,
} from '../test-data/testCaseIds';
import { GradingSummary } from '../types';
import { AllureHelper } from './allureHelper';

function caseTitle(caseLabel: string): string {
    return caseLabel.split(':').slice(1).join(':');
}

function caseId(caseLabel: string): string {
    return caseLabel.split(':')[0];
}

function gradingSummariesMatch(a: GradingSummary, b: GradingSummary): boolean {
    return JSON.stringify(normalizeGradingSummary(a)) === JSON.stringify(normalizeGradingSummary(b));
}

function normalizeGradingSummary(summary: GradingSummary): GradingSummary {
    return {
        totalScore: summary.totalScore.trim(),
        overallFeedback: (summary.overallFeedback ?? '').trim(),
        criteria: [...summary.criteria]
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((criterion) => ({
                name: criterion.name.trim(),
                points: criterion.points,
                feedback: criterion.feedback.trim(),
            })),
    };
}

async function clickCancelIfVisible(page: Page): Promise<void> {
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    if (await cancelButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('[IG Workflow] Closing customize sidebar (Cancel)...');
        await cancelButton.click();
    }
}

async function waitForPreviewDiscarded(gradingPage: PowerGraderGradingPage): Promise<void> {
    console.log('[IG Workflow] Waiting for Preview mode to disappear after Discard...');
    await expect(
        gradingPage.previewModeLabel,
        'Preview mode did not disappear after Discard',
    ).toBeHidden({ timeout: 60000 });
    await gradingPage.page.waitForTimeout(2000);
}

async function clickDiscardIfVisible(gradingPage: PowerGraderGradingPage): Promise<void> {
    if (await gradingPage.discardButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('[IG Workflow] Cleanup: clicking Discard...');
        await gradingPage.discardButton.click();
        await waitForPreviewDiscarded(gradingPage);
    }
}

/**
 * Interactive grading workflow. All UI actions go through {@link PowerGraderGradingPage}.
 * Use inline try/catch per case when non-blocking; omit try/catch to fail the test.
 */
export async function executeIgWorkflow(page: Page): Promise<void> {
    const workflowStart = Date.now();
    console.log('[IG Workflow] 🚀 START Interactive Grading workflow');

    const gradingPage = new PowerGraderGradingPage(page);
    const cancelButton = page.getByRole('button', { name: 'Cancel' });

    // C68976 — blocking : Verify 'Customize' Visibility (Header)
    console.log(`[IG Workflow] ▶ ${caseId(C68976)}: ${caseTitle(C68976)}`);
    AllureHelper.label('testCaseId', C68976);
    await expect(
        gradingPage.interactiveRegradeButton,
        'Interactive regrade button is not visible',
    ).toBeVisible({ timeout: 30000 });
    AllureHelper.label('caseStatus', `${caseId(C68976)}:passed`);
    console.log(`[IG Workflow] ✅ ${caseId(C68976)} PASSED`);

    // C69114 — non-blocking: strictness options visible in IG sidebar
    await AllureHelper.step(caseTitle(C69114), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C69114)}: ${caseTitle(C69114)}`);
        AllureHelper.label('testCaseId', C69114);
        try {
            console.log('[IG Workflow] Opening main Interactive regrade sidebar...');
            await gradingPage.interactiveRegradeButton.click();

            await expect(
                page.getByRole('button', { name: 'More Strict' }),
                'More Strict button is not visible',
            ).toBeVisible({ timeout: 30000 });
            await expect(
                page.getByRole('button', { name: 'More Lenient' }),
                'More Lenient button is not visible',
            ).toBeVisible({ timeout: 30000 });
            AllureHelper.label('caseStatus', `${caseId(C69114)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C69114)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C69114)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
        } finally {
            await clickCancelIfVisible(page);
        }
    });

    // C69008 — non-blocking: customize opens per criterion
    await AllureHelper.step(caseTitle(C69008), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C69008)}: ${caseTitle(C69008)}`);
        AllureHelper.label('testCaseId', C69008);
        try {
            const criterionSections = page.locator('div.overflow-visible.rounded-lg.p-3.shadow-sm');
            await expect(criterionSections.first()).toBeVisible({ timeout: 30000 });

            const criterionCount = await criterionSections.count();
            console.log(`[IG Workflow] Checking customize panel per criterion (${criterionCount} total)...`);
            for (let i = 0; i < criterionCount; i++) {
                const section = criterionSections.nth(i);
                const criterionName = (
                    await section.locator('h3.truncate.text-base.font-semibold.text-gray-900').innerText()
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

                const criterionNameLabels = page.getByText(criterionName, { exact: true });
                await expect(
                    criterionNameLabels.nth(1),
                    `Customize panel not visible for "${criterionName}" (expected second name label)`,
                ).toBeVisible({ timeout: 30000 });

                if (await cancelButton.isVisible({ timeout: 1500 }).catch(() => false)) {
                    await cancelButton.click();
                }
            }

            AllureHelper.label('caseStatus', `${caseId(C69008)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C69008)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C69008)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
        } finally {
            await clickCancelIfVisible(page);
        }
    });

    const firstCriterionIndex = 0;

    // C69011 — non-blocking: per-criterion IG generate + apply changes that criterion
    await AllureHelper.step(caseTitle(C69011), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C69011)}: ${caseTitle(C69011)}`);
        AllureHelper.label('testCaseId', C69011);
        try {
            const section = page
                .locator('div.overflow-visible.rounded-lg.p-3.shadow-sm')
                .nth(firstCriterionIndex);
            const criterionName = (
                await section.locator('h3.truncate.text-base.font-semibold.text-gray-900').innerText()
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

            await gradingPage.generateIG({ criterionIndex: firstCriterionIndex });

            console.log('[IG Workflow] Applying interactive grade (Apply → Apply Only Here)...');
            await gradingPage.applyButton.click();

            const applyOnlyHereButton = page.getByRole('button', { name: 'Apply Only Here' });
            await expect(applyOnlyHereButton, 'Apply Only Here button is not visible').toBeVisible({
                timeout: 30000,
            });
            await applyOnlyHereButton.click();
            await expect(
                gradingPage.previewModeLabel,
                'Preview mode did not disappear after Apply Only Here',
            ).toBeHidden({ timeout: 30000 });

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
            AllureHelper.label('caseStatus', `${caseId(C69011)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C69011)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C69011)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
            await clickDiscardIfVisible(gradingPage);
        }
    });

    console.log('[IG Workflow] Capturing baseline before main generateIG...');
    const summaryBeforeGenerate = await gradingPage.getGradingSummary();
    console.log(`[IG Workflow] Baseline total score: ${summaryBeforeGenerate.totalScore}`);

    // C68986 / C68987 — non-blocking: preview persists after reload (navigation)
    await AllureHelper.step(caseTitle(C68986), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C68986)}: ${caseTitle(C68986)}`);
        AllureHelper.label('testCaseId', C68986);
        console.log(`[IG Workflow] ▶ ${caseId(C68987)}: ${caseTitle(C68987)}`);
        AllureHelper.label('testCaseId', C68987);
        try {
            console.log('[IG Workflow] Main generateIG (More Lenient → More Encouraging → Generate)...');
            await gradingPage.generateIG();
            console.log('[IG Workflow] Reloading page to verify Preview mode persists...');
            await page.reload({ waitUntil: 'networkidle' });
            await gradingPage.waitForLoad();

            await expect(
                gradingPage.previewModeLabel,
                'Preview mode not visible after reload',
            ).toBeVisible({ timeout: 30000 });
            AllureHelper.label('caseStatus', `${caseId(C68986)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C68986)} PASSED`);
            AllureHelper.label('caseStatus', `${caseId(C68987)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C68987)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C68986)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
            console.warn(
                `[IG Workflow] ❌ ${caseId(C68987)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
        }
    });

    // C68985 — non-blocking: discard restores original grades
    await AllureHelper.step(caseTitle(C68985), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C68985)}: ${caseTitle(C68985)}`);
        AllureHelper.label('testCaseId', C68985);
        try {
            console.log('[IG Workflow] Clicking Discard to restore original grades...');
            await gradingPage.discardButton.click();
            await waitForPreviewDiscarded(gradingPage);

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
            AllureHelper.label('caseStatus', `${caseId(C68985)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C68985)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C68985)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
            await clickDiscardIfVisible(gradingPage);
        }
    });

    // C68989 — non-blocking: apply flow and grades change after Apply Only Here
    await AllureHelper.step(caseTitle(C68989), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C68989)}: ${caseTitle(C68989)}`);
        AllureHelper.label('testCaseId', C68989);
        try {
            const summaryBeforeApply = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] Before apply flow, total score: ${summaryBeforeApply.totalScore}`);

            console.log('[IG Workflow] generateIG for apply flow (More Lenient → More Encouraging → Generate)...');
            await gradingPage.generateIG();
            const summaryInPreview = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] Preview total score: ${summaryInPreview.totalScore}`);

            console.log('[IG Workflow] Opening Apply modal...');
            await gradingPage.applyButton.click();

            const applyToAllButton = page.getByRole('button', { name: 'Apply to All' });
            const applyOnlyHereButton = page.getByRole('button', { name: 'Apply Only Here' });

            await AllureHelper.step(caseTitle(C69094), async () => {
                console.log(`[IG Workflow] ▶ ${caseId(C69094)}: ${caseTitle(C69094)}`);
                AllureHelper.label('testCaseId', C69094);
                try {
                    await expect(applyToAllButton, 'Apply to All button is not visible').toBeVisible({
                        timeout: 30000,
                    });
                    await expect(applyOnlyHereButton, 'Apply Only Here button is not visible').toBeVisible({
                        timeout: 30000,
                    });
                    AllureHelper.label('caseStatus', `${caseId(C69094)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(C69094)} PASSED`);
                } catch (error) {
                    console.warn(
                        `[IG Workflow] ❌ ${caseId(C69094)} FAILED (non-blocking):`,
                        error instanceof Error ? error.message : String(error),
                    );
                }
            });

            console.log('[IG Workflow] Clicking Apply Only Here...');
            console.log(`[IG Workflow] ▶ ${caseId(C69095)}: ${caseTitle(C69095)}`);
            AllureHelper.label('testCaseId', C69095);
            await applyOnlyHereButton.click();
            await expect(
                gradingPage.previewModeLabel,
                'Preview mode did not disappear after Apply Only Here',
            ).toBeHidden({ timeout: 30000 });
            AllureHelper.label('caseStatus', `${caseId(C69095)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C69095)} PASSED`);

            const summaryAfterApply = await gradingPage.getGradingSummary();
            console.log(`[IG Workflow] After Apply Only Here, total score: ${summaryAfterApply.totalScore}`);

            await AllureHelper.step(caseTitle(C69034), async () => {
                console.log(`[IG Workflow] ▶ ${caseId(C69034)}: ${caseTitle(C69034)}`);
                AllureHelper.label('testCaseId', C69034);
                console.log(`[IG Workflow] ▶ ${caseId(C75537)}: ${caseTitle(C75537)}`);
                AllureHelper.label('testCaseId', C75537);
                try {
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
                    AllureHelper.label('caseStatus', `${caseId(C69034)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(C69034)} PASSED`);
                    AllureHelper.label('caseStatus', `${caseId(C75537)}:passed`);
                    console.log(`[IG Workflow] ✅ ${caseId(C75537)} PASSED`);
                } catch (error) {
                    console.warn(
                        `[IG Workflow] ❌ ${caseId(C69034)} FAILED (non-blocking):`,
                        error instanceof Error ? error.message : String(error),
                    );
                    console.warn(
                        `[IG Workflow] ❌ ${caseId(C75537)} FAILED (non-blocking):`,
                        error instanceof Error ? error.message : String(error),
                    );
                }
            });

            const differsFromBaseline = !gradingSummariesMatch(summaryBeforeApply, summaryAfterApply);
            if (differsFromBaseline) {
                console.log('[IG Workflow] Applied vs baseline comparison OK — grades differ as expected.');
            }

            expect(
                differsFromBaseline,
                'Grading summary should differ from original after applying interactive grade',
            ).toBe(true);
            AllureHelper.label('caseStatus', `${caseId(C68989)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C68989)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C68989)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
            await clickDiscardIfVisible(gradingPage);
        }
    });

    const assignmentDetailsPage = new PowerGraderAssignmentDetailsPage(page);

    // C69023 — non-blocking: publish IG score persists after reopening submission
    await AllureHelper.step(caseTitle(C69023), async () => {
        console.log(`[IG Workflow] ▶ ${caseId(C69023)}: ${caseTitle(C69023)}`);
        AllureHelper.label('testCaseId', C69023);
        try {
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
            await gradingPage.waitForLoad();

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
            AllureHelper.label('caseStatus', `${caseId(C69023)}:passed`);
            console.log(`[IG Workflow] ✅ ${caseId(C69023)} PASSED`);
        } catch (error) {
            console.warn(
                `[IG Workflow] ❌ ${caseId(C69023)} FAILED (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
        }
    });

    const durationMin = ((Date.now() - workflowStart) / 60000).toFixed(1);
    console.log(`[IG Workflow] ✅ FINISH Interactive Grading workflow (${durationMin} min)`);
}
