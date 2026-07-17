import { expect, Locator, Page } from '@playwright/test';

/** Level on an AI-generated rubric (PowerGrader), not an LMS-attached rubric. */
export type AiRubricLevelSummary = {
    title: string;
    description: string;
    score: number;
};

/** Criterion on an AI-generated rubric (PowerGrader), not an LMS-attached rubric. */
export type AiRubricCriterionSummary = {
    name: string;
    levels: AiRubricLevelSummary[];
};

/** Snapshot of the AI-generated rubric shown on the Rubric tab after PowerGrader generates it. */
export type AiRubricSummary = {
    criteria: AiRubricCriterionSummary[];
};

export type AiRubricEditVerification = {
    original: AiRubricSummary;
    expected: AiRubricSummary;
    persisted: AiRubricSummary;
};

export class PowerGraderAssignmentDetailsPage {
    private static readonly POST_PUBLISH_NAV_TIMEOUT_MS = 120_000;
    private static readonly POST_PUBLISH_DETAILS_URL = /\/assignments\/RegisterAssignmentPublicUUID--/;

    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * After Publish: wait for backend + redirect to assignment details, then assert View is visible.
     */
    async waitForPostPublishAssignmentDetails(label: string): Promise<void> {
        await this.page.waitForURL(PowerGraderAssignmentDetailsPage.POST_PUBLISH_DETAILS_URL, {
            timeout: PowerGraderAssignmentDetailsPage.POST_PUBLISH_NAV_TIMEOUT_MS,
        });
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('networkidle').catch(() => {});

        const viewBtn = this.page.locator('button[data-slot="button"]').filter({ hasText: /^View$/i }).first();
        await expect(viewBtn).toBeVisible({ timeout: 30_000 });
        console.log(`[${label}] Post-publish: assignment details + View confirmed.`);
    }

    /**
     * Opens the Rubric tab and returns the AI-generated rubric (criteria + levels)
     * shown in the UI — not an LMS-attached rubric.
     */
    async getAiRubricSummary(): Promise<AiRubricSummary> {
        const rubricTab = this.page.getByTestId('assignment-tab-rubric');
        await expect(rubricTab, 'Rubric tab is not visible after publishing').toBeVisible({
            timeout: 30_000,
        });
        await rubricTab.click();

        const criterionCards = this.page.locator('div.flex.flex-1.flex-col.gap-3');
        const criterionRows = this.page.locator('div.overflow-hidden.rounded-xl.border-2');
        await expect(
            criterionRows.first(),
            'No AI-generated rubric criteria are visible',
        ).toBeVisible({
            timeout: 30_000,
        });

        const criterionCount = await criterionCards.count();
        const rowCount = await criterionRows.count();
        expect(
            criterionCount,
            'AI-generated rubric should contain at least one criterion',
        ).toBeGreaterThan(0);
        expect(
            rowCount,
            'Criterion name cards and AI rubric row containers should have matching counts',
        ).toBe(criterionCount);

        const criteria: AiRubricCriterionSummary[] = [];
        for (let criterionIndex = 0; criterionIndex < criterionCount; criterionIndex += 1) {
            const criterionName = (
                await criterionCards.nth(criterionIndex).locator('p').nth(1).innerText()
            ).trim();
            expect(criterionName, `Criterion ${criterionIndex + 1} should have a name`).not.toBe('');

            const levelCards = criterionRows
                .nth(criterionIndex)
                .locator('div.flex.h-full.min-h-0.flex-col.border');
            const levelCount = await levelCards.count();
            expect(
                levelCount,
                `Criterion "${criterionName}" should contain at least one level`,
            ).toBeGreaterThan(0);

            const levels: AiRubricLevelSummary[] = [];
            for (let levelIndex = 0; levelIndex < levelCount; levelIndex += 1) {
                const levelCard = levelCards.nth(levelIndex);
                const scoreText = (
                    await levelCard
                        .getByText('Score', { exact: true })
                        .locator('xpath=following-sibling::span[1]')
                        .innerText()
                ).trim();
                const score = Number(scoreText);
                expect(
                    Number.isFinite(score),
                    `Level ${levelIndex + 1} of "${criterionName}" should have a numeric score`,
                ).toBe(true);

                const levelText = levelCard.locator('p');
                expect(
                    await levelText.count(),
                    `Level ${levelIndex + 1} of "${criterionName}" should have a title and description`,
                ).toBeGreaterThanOrEqual(2);

                levels.push({
                    score,
                    title: (await levelText.nth(0).innerText()).trim(),
                    description: (await levelText.nth(1).innerText()).trim(),
                });
            }

            criteria.push({ name: criterionName, levels });
        }

        return { criteria };
    }

    /**
     * Applies each supported edit to the PowerGrader-generated rubric, saves it,
     * reloads the page, and verifies that the resulting rubric persisted exactly.
     *
     * Simple fixed edit sequence for employee-performance XLSX rubrics
     * (typically ~5 criteria; requires at least 3).
     */
    async editAiRubricAndVerifyPersistence(): Promise<AiRubricEditVerification> {
        try {
            const original = await this.getAiRubricSummary();
            expect(
                original.criteria.length,
                'AI rubric needs at least 3 criteria',
            ).toBeGreaterThanOrEqual(3);
            expect(
                original.criteria[0].levels.length,
                'The first AI rubric criterion needs at least 2 levels',
            ).toBeGreaterThanOrEqual(2);
            expect(
                original.criteria[1].levels.length,
                'The second AI rubric criterion needs at least 1 level',
            ).toBeGreaterThanOrEqual(1);

            const expected: AiRubricSummary = {
                criteria: original.criteria.map(criterion => ({
                    name: criterion.name,
                    levels: criterion.levels.map(level => ({ ...level })),
                })),
            };

            const editRubricButton = this.page.getByRole('button', { name: 'Edit rubric' });
            await expect(editRubricButton).toBeVisible({ timeout: 30_000 });
            await editRubricButton.click();

            const criterionRows = this.page.locator('div.overflow-hidden.rounded-xl.border-2');
            const removeCriterionButtons = this.page.getByRole('button', {
                name: 'Remove criterion',
            });
            await expect(criterionRows).toHaveCount(original.criteria.length);

            const levelCards = (rowIndex: number) =>
                criterionRows.nth(rowIndex).locator('div.flex.h-full.min-h-0.flex-col.border');

            // 1) First criterion: remove last level, then edit the previous second-last (score + 5).
            const firstLevels = levelCards(0);
            const firstLevelCountBeforeRemoval = await firstLevels.count();
            await firstLevels
                .nth(original.criteria[0].levels.length - 1)
                .getByRole('button', { name: 'Remove level' })
                .click();
            await expect(firstLevels).toHaveCount(firstLevelCountBeforeRemoval - 1);
            expected.criteria[0].levels.pop();

            const firstEditIndex = expected.criteria[0].levels.length - 1;
            const firstEditOriginal = expected.criteria[0].levels[firstEditIndex];
            const editedLevel: AiRubricLevelSummary = {
                score: firstEditOriginal.score + 5,
                title:
                    'Most employee performance scores and final ratings align, with only minor mismatches across records.',
                description:
                    'Most employee performance scores and final ratings align, with only minor mismatches across records.',
            };
            await this.fillAiRubricLevel(firstLevels.nth(firstEditIndex), editedLevel);
            expected.criteria[0].levels[firstEditIndex] = editedLevel;

            // 2) Second criterion: add a level (last score + 10).
            const secondLevels = levelCards(1);
            const secondLastOriginal =
                original.criteria[1].levels[original.criteria[1].levels.length - 1];
            const addedLevel: AiRubricLevelSummary = {
                score: secondLastOriginal.score + 10,
                title:
                    'Most employee scores and final ratings align correctly, with only occasional mismatches that do not undermine overall spreadsheet reliability.',
                description:
                    'Most employee scores and final ratings align correctly, with only occasional mismatches that do not undermine overall spreadsheet reliability.',
            };
            const secondLevelCountBeforeAdd = await secondLevels.count();
            await criterionRows
                .nth(1)
                .getByRole('button', { name: 'Add level' })
                .click();
            await expect(secondLevels).toHaveCount(secondLevelCountBeforeAdd + 1);
            await this.fillAiRubricLevel(secondLevels.last(), addedLevel);
            expected.criteria[1].levels.push(addedLevel);

            // 3) Remove the last criterion.
            const lastCriterionIndex = original.criteria.length - 1;
            const criterionCountBeforeRemoval = await criterionRows.count();
            await removeCriterionButtons.nth(lastCriterionIndex).click();
            await expect(criterionRows).toHaveCount(criterionCountBeforeRemoval - 1);
            expected.criteria.pop();

            // 4) Add a new criterion with three levels.
            const addedCriterion: AiRubricCriterionSummary = {
                name: 'Consistency of Employee Final Ratings',
                levels: [
                    {
                        score: 0,
                        title:
                            'Final ratings conflict with recorded performance scores for most employees, or ratings are missing from the spreadsheet.',
                        description:
                            'Final ratings conflict with recorded performance scores for most employees, or ratings are missing from the spreadsheet.',
                    },
                    {
                        score: 5,
                        title:
                            'Most employee final ratings align with performance scores, with a few mismatches across the employee records.',
                        description:
                            'Most employee final ratings align with performance scores, with a few mismatches across the employee records.',
                    },
                    {
                        score: 10,
                        title:
                            'Every employee final rating correctly reflects the recorded performance score, and rating labels are applied consistently across the spreadsheet.',
                        description:
                            'Every employee final rating correctly reflects the recorded performance score, and rating labels are applied consistently across the spreadsheet.',
                    },
                ],
            };

            const criterionCountBeforeAdd = await criterionRows.count();
            await this.page.getByRole('button', { name: 'Add criterion' }).click();
            await expect(criterionRows).toHaveCount(criterionCountBeforeAdd + 1);

            const addedCriterionNameInput = this.page
                .locator('div.flex.flex-1.flex-col.gap-3')
                .last()
                .getByRole('textbox', { name: 'Criterion name' });
            await addedCriterionNameInput.clear();
            await addedCriterionNameInput.fill(addedCriterion.name);

            const addedCriterionLevels = levelCards(await criterionRows.count() - 1);
            await expect(addedCriterionLevels).toHaveCount(2);
            await this.fillAiRubricLevel(addedCriterionLevels.nth(0), addedCriterion.levels[0]);
            await this.fillAiRubricLevel(addedCriterionLevels.nth(1), addedCriterion.levels[1]);

            await criterionRows.last().getByRole('button', { name: 'Add level' }).click();
            await expect(addedCriterionLevels).toHaveCount(3);
            await this.fillAiRubricLevel(addedCriterionLevels.nth(2), addedCriterion.levels[2]);
            expected.criteria.push(addedCriterion);

            const expectedSorted = this.sortAiRubricSummary(expected);

            const saveRubricButton = this.page.getByRole('button', { name: 'Save rubric' });
            await expect(saveRubricButton).toBeVisible();
            await saveRubricButton.click();
            await expect(saveRubricButton).not.toBeVisible({ timeout: 30_000 });
            await expect(this.page.getByRole('button', { name: 'Edit rubric' })).toBeVisible({
                timeout: 30_000,
            });
            await this.page.waitForTimeout(3_000);

            // Compare only after reload (no post-save pre-reload assert).
            await this.page.reload({ waitUntil: 'load', timeout: 180_000 });
            await this.page.waitForLoadState('networkidle', { timeout: 180_000 });
            await this.page.waitForTimeout(3_000);

            const persisted = this.sortAiRubricSummary(await this.getAiRubricSummary());
            expect(
                persisted,
                'The AI rubric after reload should exactly match the edits that were saved',
            ).toEqual(expectedSorted);

            return { original, expected: expectedSorted, persisted };
        } finally {
            try {
                await this.page.getByRole('tab', { name: 'Submissions' }).click({ timeout: 10_000 });
                console.log('Switched back to Submissions tab after AI rubric edit case.');
            } catch (error) {
                console.warn(
                    'Could not switch back to Submissions tab after AI rubric edit case:',
                    error instanceof Error ? error.message : String(error),
                );
            }
        }
    }

    /** Match UI ordering: criteria A–Z by name, levels ascending by score. */
    private sortAiRubricSummary(summary: AiRubricSummary): AiRubricSummary {
        return {
            criteria: [...summary.criteria]
                .map(criterion => ({
                    name: criterion.name,
                    levels: [...criterion.levels].sort((a, b) => a.score - b.score),
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        };
    }

    private async fillAiRubricLevel(
        levelCard: Locator,
        level: AiRubricLevelSummary,
    ): Promise<void> {
        await levelCard.scrollIntoViewIfNeeded();

        const scoreInput = levelCard.locator('input[type="number"]');
        await scoreInput.clear();
        await scoreInput.fill(String(level.score));

        const titleInput = levelCard.getByRole('textbox', { name: 'Level title' });
        await titleInput.clear();
        await titleInput.fill(level.title);

        const descriptionInput = levelCard.getByRole('textbox', { name: 'Level description' });
        await descriptionInput.clear();
        await descriptionInput.fill(level.description);
    }

    /** Reopens the first student submission from assignment details (post-publish View button). */
    async reopenFirstStudentSubmission(label: string): Promise<void> {
        const viewButton = this.page.getByRole('button', { name: 'View' }).first();
        await expect(viewButton).toBeVisible({ timeout: 30_000 });
        console.log(`[${label}] Reopening first student submission...`);
        await viewButton.click();
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        await this.page.waitForTimeout(1000);
    }

    async expectPageLoaded(assignmentTitle: string): Promise<void> {
        await expect(this.page).toHaveURL(/\/assignments\/RegisterAssignmentPublicUUID--/, { timeout: 30000 });
        const assignmentHeading = this.page.locator('h1').filter({ hasText: assignmentTitle }).first();
        await expect(assignmentHeading).toBeVisible({ timeout: 30000 });
    }
    async handleNoRubricStateIfPresent(): Promise<void> {
        // Locator based on your screenshot's HTML structure
            const generateBtn = this.page.locator('button').filter({ hasText: 'Generate Compatible Rubric' });
            const errorBanner = this.page.getByText("There is currently no rubric. We can't begin grading without one.");
            const haltedBadge = this.page.getByText('Grading Halted, No Rubric');

            if (await generateBtn.isVisible({ timeout: 5000 })) {
                console.log("[Details Page] 'No Rubric' banner detected. Triggering Generation...");
                
                await generateBtn.click();

                // Polling
                await expect(async () => {
                    console.log("[Details Page] Polling: Waiting for 'Grading Halted' to clear...");
                    await this.page.reload({ waitUntil: 'networkidle' });
                    
                    // The test passes this step once the error banner and halted badge are gone
                    await expect(errorBanner).not.toBeVisible();
                    await expect(haltedBadge).not.toBeVisible();
                }).toPass({
                    intervals: [15000], 
                    timeout: 180000 // 3 minute max wait for AI rubric generation
                });

                console.log("[Details Page] Rubric generated successfully.");
            }
    }

    //Update by Tusha
    async clickViewButtonForStudent(studentEmail: string): Promise<void> {
        // First, check and handle the No Rubric/Halted state if it exists
        // This method now includes the internal polling we discussed
        await this.handleNoRubricStateIfPresent();

        // Locate the specific student row
       // Find exact student email text (p tag) and then use its nearest table row.
       const studentEmailText = this.page.getByText(studentEmail, { exact: true });
       await expect(studentEmailText).toBeVisible({ timeout: 30000 });

       const studentRow = studentEmailText.locator('xpath=ancestor::tr[1]');
       await expect(studentRow).toBeVisible({ timeout: 30000 });

        const viewDetailsButton = studentRow.getByRole('button', { name: 'View details', exact: true });
        const viewButton = studentRow.getByRole('button', { name: 'View', exact: true });

        let actionButton = viewDetailsButton;
        if (await viewDetailsButton.isVisible({ timeout: 3000 }).catch(() => false)) {} 
        else {
            await expect(
                viewButton,
                `Neither "View details" nor "View" button is visible for "${studentEmail}"`,
            ).toBeVisible({ timeout: 30000 });
            actionButton = viewButton;
        }

        // Scroll and Click
        await expect(actionButton).toBeVisible({ timeout: 30000 });
        await actionButton.scrollIntoViewIfNeeded();
        
        const label = await actionButton.innerText();
        console.log(`[Details Page] Final state reached. Clicking "${label.trim()}" for ${studentEmail}`);
        
        await actionButton.click();
        await this.page.waitForLoadState('networkidle');
    }

    //Update by Tusha
    /**
     * Clicks the 'See Why' button in the incompatibility banner.
     */
    async clickSeeWhy(): Promise<void> {
        //console.log("[Details Page] 'See Why' clicked successfully.");
        const seeWhyBtn = this.page.getByRole('button', { name: /See Why/i });
        await expect(seeWhyBtn).toBeVisible({ timeout: 10000 });
        console.log("[Details Page] 'See Why' located.");
        await seeWhyBtn.click();
        console.log("[Details Page] 'See Why' clicked successfully.");
    }

    async clickGradeAnyway(): Promise<void> {
    const pageBtn = this.page.getByRole('button', { name: /^Grade Anyway$/i }).first();

    // 1) Prefer the page banner button (your screenshot)
    if (await pageBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await expect(pageBtn).toBeVisible({ timeout: 30000 });
        await pageBtn.scrollIntoViewIfNeeded();
        await pageBtn.click({ force: true, timeout: 30000 });
        console.log("[Details Page] 'Grade Anyway' clicked (page).");
        return;
    }

    // 2) Fallback: modal/dialog button if UI uses a dialog
    const dialog = this.page.getByRole('dialog').first();
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
        const modalBtn = dialog.getByRole('button', { name: /^Grade Anyway$/i }).first();
        await expect(modalBtn).toBeVisible({ timeout: 30000 });
        await modalBtn.scrollIntoViewIfNeeded();
        await modalBtn.click({ force: true, timeout: 30000 });
        console.log("[Details Page] 'Grade Anyway' clicked (modal).");
        return;
    }

    throw new Error("Grade Anyway button not found (page or modal).");
    }
}

