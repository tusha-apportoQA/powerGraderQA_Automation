import { expect, Locator, Page } from '@playwright/test';
import { CriterionScore, CriterionEditEntry, GradingSummary } from '../../../types';
import { AllureHelper } from '../../../utils/allureHelper';

export class PowerGraderGradingPage {
    page: Page;
    interactiveRegradeButton: Locator;
    applyButton: Locator;
    discardButton: Locator;
    previewModeLabel: Locator;

    constructor(page: Page) {
        this.page = page;
        this.interactiveRegradeButton = page
            .getByRole('button', { name: 'Interactive regrade' })
            .first();
        this.applyButton = page.getByRole('button', { name: 'Apply' });
        this.discardButton = page.getByRole('button', { name: 'Discard' });
        this.previewModeLabel = page.getByText('Preview mode', { exact: true });
    }

    async waitForLoad(): Promise<void> {
       // Force wait for the grading room URL pattern before proceeding
        await this.page.waitForURL(/\/RegisterSubmissionPublicUUID--/, { timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
        console.log("[Grading Page] URL detected, network idle. Proceeding to score check.");
    }

    async expectPageLoaded(studentName?: string): Promise<void> {
        await expect(this.page).toHaveURL(/\/RegisterSubmissionPublicUUID--/, { timeout: 30000 });
        if (studentName) {
            const studentNameElement = this.page.getByText(studentName, { exact: false }).first();
            await expect(studentNameElement).toBeVisible({ timeout: 30000 });
        }
    }
  
    //Update by Tusha
    /*async verifyGradesAndFeedbackPopulated(): Promise<void> {
        console.log("[Grading Page] Verifying AI Grades data is present...");
        // Just verify the element is visible and populated without logging it here
        //const totalGradeHeader = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[1]/div[2]/div[1]/h2');
        const totalGradeHeader = this.page.locator('h2').filter({ hasText: /\// });
        await expect(totalGradeHeader).toContainText('/', { timeout: 60000 });

        const criteriaContent = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[2]/div[1]/div/div/div/div/div[1]/div[2]');
        await expect(criteriaContent).toBeVisible({ timeout: 20000 });
        
        console.log("[Grading Page] AI Results verified successfully.");
    }*/

    //new UI update - Tusha
    async verifyGradesAndFeedbackPopulated(): Promise<void> {
        console.log("[Grading Page] Verifying AI Grades data is present...");

        // Total score: h2 with tabular-nums class
        const totalGradeHeader = this.page.locator('h2.text-2xl.font-bold.text-gray-900.tabular-nums');
        await expect(totalGradeHeader).toBeVisible({ timeout: 60000 });

        // At least one criterion section visible
        const firstCriterion = this.page.locator('div.overflow-visible.rounded-lg.shadow-sm').first();
        await expect(firstCriterion).toBeVisible({ timeout: 60000 });

        // At least one AI Feedback block visible
        const firstFeedback = this.page.locator('div.flex.min-h-28.flex-col.gap-2').first();
        await expect(firstFeedback).toBeVisible({ timeout: 60000 });

        console.log("[Grading Page] AI Results verified successfully.");
    }

    async expectDueDateVisible(): Promise<void> {
        const dueDateLabel = this.page.getByText('Due:');
        await expect(dueDateLabel, 'Due date label is not visible on grading page').toBeVisible({
            timeout: 10000,
        });
        await expect(dueDateLabel, 'Due date label should resolve to a single element').toHaveCount(1);
    }

    async expectSubmissionFileDisplayed(): Promise<void> {
        const submissionTab = this.page.getByRole('tab', { name: 'Submission' });
        await expect(submissionTab, 'Submission tab is not visible on grading page').toBeVisible({
            timeout: 10000,
        });
        await submissionTab.click();
        await this.page.waitForTimeout(10_000);
        const fileLabel = this.page.getByText('test_submission');
        await expect(
            fileLabel,
            'Submitted file "test_submission" is not visible on Submission tab',
        ).toBeVisible({ timeout: 10000 });
    }

    /** Selected pills use border-blue-500 / bg-blue-50 (not aria-pressed). */
    private async isIgPillSelected(pill: Locator): Promise<boolean> {
        return pill.evaluate((el) => el.classList.contains('border-blue-500'));
    }

    /**
     * Select an IG pill. Skips if already selected.
     * In-browser click avoids Playwright "stable" wait while React remounts the node.
     */
    private async selectIgPill(name: string): Promise<void> {
        const pill = this.page.getByRole('button', { name });
        await expect(pill, `${name} is not visible`).toBeVisible({ timeout: 30000 });

        if (await this.isIgPillSelected(pill)) {
            console.log(`[Grading Page] IG option "${name}" already selected`);
            return;
        }

        console.log(`[Grading Page] Selecting IG option: ${name}`);
        await pill.evaluate((el) => el.click());
        await this.page.waitForTimeout(300);

        await expect.poll(() => this.isIgPillSelected(pill), { timeout: 5000 }).toBe(true);
        await this.page.waitForTimeout(300);
        console.log(`[Grading Page] IG option "${name}" selected`);
    }

    /**
     * Opens IG (Interactive regrade), sets options, and generates preview.
     * Without `criterionIndex`, uses the main header Interactive regrade button.
     * With `criterionIndex`, uses that criterion section's Interactive regrade button.
     */
    async generateIG(options?: { criterionIndex?: number }): Promise<void> {
        const previewModeTimeoutMs = 3 * 60 * 1000;
        const criterionIndex = options?.criterionIndex;
        const igScope =
            criterionIndex !== undefined ? `criterion index ${criterionIndex}` : 'main header';
        console.log(`[Grading Page] generateIG: opening Interactive regrade (${igScope})...`);

        let igButton: Locator;
        if (criterionIndex !== undefined) {
            const section = this.page
                .locator('div.overflow-visible.rounded-lg.shadow-sm')
                .nth(criterionIndex);
            igButton = section.getByRole('button', { name: 'Interactive regrade' });
            await expect(
                igButton,
                `Interactive regrade button is not visible for criterion index ${criterionIndex}`,
            ).toBeVisible({ timeout: 30000 });
        } else {
            igButton = this.interactiveRegradeButton;
            await expect(
                igButton,
                'Interactive regrade button is not visible',
            ).toBeVisible({ timeout: 60000 });
        }
        await igButton.click();
        await this.page.waitForTimeout(500);

        const generateButton = this.page.getByRole('button', { name: 'Generate' });
        await expect(generateButton, 'Generate button is not visible').toBeVisible({
            timeout: 30000,
        });

        console.log('[Grading Page] generateIG: setting More Lenient...');
        await this.selectIgPill('More Lenient');
        console.log('[Grading Page] generateIG: setting More Encouraging...');
        await this.selectIgPill('More Encouraging');
        await this.page.waitForTimeout(500);

        console.log('[Grading Page] generateIG: clicking Generate (preview may take a few minutes)...');
        await generateButton.click();
        await this.page.waitForTimeout(300);

        await expect(
            igButton,
            'Interactive regrade button should be disabled after clicking Generate',
        ).toBeDisabled({ timeout: 30000 });

        await expect(
            this.previewModeLabel,
            'Preview mode did not appear after interactive grade generation',
        ).toBeVisible({ timeout: previewModeTimeoutMs });

        console.log('[Grading Page] Interactive grade preview generated (Preview mode visible).');
    }

    //Update by Tusha
    /*async getTotalScore(): Promise<string> {
        //console.log(`[Grading Page] Target XPath: /html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[1]/div[2]/div[1]/h2`);
       // const totalGradeHeader = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[1]/div[2]/div[1]/h2');
        const totalGradeHeader = this.page.locator('h2').filter({ hasText: /\// });
        // Explicitly wait for the header to contain a slash "/" to ensure AI data is loaded
        //await expect(totalGradeHeader).toContainText('/', { timeout: 30000 });
        
        //const text = await totalGradeHeader.innerText();
        const scoreText = await totalGradeHeader.innerText();
        console.log(`[Grading Page] Found Total Score Text: ${scoreText}`);
        return scoreText.trim();
        
        //return scoreText.split('/')[0].trim(); 
    }*/

    //new UI update - Tusha
    async getTotalScore(): Promise<string> {
        const totalGradeHeader = this.page.locator('h2.text-2xl.font-bold.text-gray-900.tabular-nums');
        await expect(totalGradeHeader).toBeVisible({ timeout: 30000 });
        const scoreText = await totalGradeHeader.innerText();
        console.log(`[Grading Page] Found Total Score Text: ${scoreText}`);
        return scoreText.trim();
    }

    /*async getIndividualScore(): Promise<string> {
        const scoreInput = this.page.locator('input[placeholder="Enter score"]').first();
        return await scoreInput.inputValue();
    }*/

    //New UI update - Tusha
    async getIndividualScore(): Promise<string> {
        // New UI: read from the selected card (border-blue-500) score div, fallback to custom input
        const selectedCard = this.page.locator('div.border-blue-500').first();
        const scoreDiv = selectedCard.locator('div.relative.flex.h-7.w-7');
        if (await scoreDiv.count() > 0) {
            return (await scoreDiv.innerText()).trim();
        }
        const customInput = selectedCard.locator('input[type="number"]');
        return await customInput.inputValue();
    }



    //Update by Tusha
   /* async getAllFeedback(): Promise<string[]> {
        const feedbackSections = this.page.locator('span[class*="text-primary-color"]');
        return await feedbackSections.allInnerTexts();
    }*/

    async getAllFeedback(): Promise<string[]> {
        // Finds the "Overall Feedback" heading and then grabs the text from the following container
        const overallFeedbackContainer = this.page.locator('div')
            .filter({ hasText: /^Overall Feedback$/i })
            .locator('..') // Move to parent
            .locator('span, p, div') // Target text elements
            .filter({ hasText: /[a-zA-Z]/ });

        const texts = await overallFeedbackContainer.allInnerTexts();
        return texts.map(t => t.trim()).filter(t => t.length > 0);
    }
    /**
     * Clicks publish and handles the potential confirmation modal. Update by Tusha
     */
    async clickPublishButton(): Promise<void> {
        await this.page.waitForTimeout(60000);
        const publishButton = this.page.getByRole('button', { name: 'Publish' }).first();
        //await expect(publishButton).toBeEnabled({ timeout: 60000 });
       // await this.page.waitForTimeout(3000);   

        const certifyCheckbox = this.page.getByRole('checkbox', {
            name: /I certify this grade can be released to the student/
        });
        console.log(`Publish Button Found..`);
        const clickAndHandleModal = async (attempt: number) => {
            await expect(publishButton).toBeVisible({ timeout: 30000 });
            await expect(publishButton).toBeEnabled({ timeout: 10000 });
            await publishButton.click();
            console.log(`Publish Button Clicked (attempt ${attempt})..`);

            if (await certifyCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
                await certifyCheckbox.check();
                const studentCommentInput = this.page.getByRole('textbox', { name: 'Add a comment to the student' });
                await expect(studentCommentInput).toBeVisible({ timeout: 10000 });
                await studentCommentInput.fill('feedback');
                await this.page.waitForTimeout(300);
                const modalPublishButton = this.page.getByRole('button', { name: 'Publish' }).last();
                await expect(modalPublishButton).toBeVisible({ timeout: 10000 });
                await expect(modalPublishButton).toBeEnabled({ timeout: 10000 });
                await modalPublishButton.click();
                console.log(`Certification modal handled and final publish clicked..`);
            }
        };

        await clickAndHandleModal(1);
        await this.page.waitForTimeout(30000);


        // If first click did not register, retry once with same flow.
        if (/\/RegisterSubmissionPublicUUID--/.test(this.page.url())) {
            console.log('Still on submission page after publish; retrying publish click once.');
            await clickAndHandleModal(2);
            await this.page.waitForTimeout(30000);
        }
        if (/\/RegisterSubmissionPublicUUID--/.test(this.page.url())) {
            console.log('Still on submission page after publish; retrying publish click (attempt 3).');
            await clickAndHandleModal(3);
        }
        
        //await this.page.waitForLoadState('networkidle');
        await this.page.waitForURL(/\/assignments\/RegisterAssignmentPublicUUID--/, { timeout: 60000 });
    }

    /**
     * Sets score and feedback for a single criterion by 0-based index (teacher edit).
     * Score and feedback are required so we always start from the score input; Tab then focuses the edit-feedback button.
     */
   /* async setCriterionResultByIndex(criterionIndex: number, score: number, feedback: string): Promise<void> {
        const scoreInput = this.page.locator('div.score-selection').locator('input[placeholder="Enter score"]').nth(criterionIndex);
        await expect(scoreInput).toBeVisible({ timeout: 10000 });

        await scoreInput.clear();
        await scoreInput.fill(String(score));
        await this.page.waitForTimeout(300);

        await scoreInput.click();
        await this.page.waitForTimeout(200);
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(200);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(300);

        const editable = this.page.locator('div[contenteditable="true"][spellcheck="false"]').first();
        await expect(editable).toBeVisible({ timeout: 10000 });
        await editable.click();
        await editable.fill(feedback);
        await this.page.waitForTimeout(300);

        const saveBtn = editable.locator('xpath=..').locator('button').nth(1);
        await saveBtn.click();
        await this.page.waitForTimeout(300);
    }*/

    //New UI Update - Tusha
    /*async setCriterionResultByIndex(criterionIndex: number, score: number, feedback: string): Promise<void> {
        const criterionSections = this.page.locator('div.overflow-visible.rounded-lg.p-3.shadow-sm');
        const section = criterionSections.nth(criterionIndex);

        // Try clicking a preset level card that matches the score
        const levelCards = section.locator('div.rounded-lg.border-2').filter({ hasNot: this.page.locator('input[placeholder="Score"]') });
        const cardCount = await levelCards.count();
        let scoreSet = false;

        for (let i = 0; i < cardCount; i++) {
            const card = levelCards.nth(i);
            const scoreDiv = card.locator('div.inline-flex.h-9.min-w-9');
            if (await scoreDiv.count() > 0) {
                const cardScore = parseFloat((await scoreDiv.innerText()).trim());
                if (cardScore === score) {
                    await card.click();
                    await this.page.waitForTimeout(300);
                    scoreSet = true;
                    break;
                }
            }
        }

        if (!scoreSet) {
            // Use custom score input
            const customInput = section.locator('input[placeholder="Score"]').first();
            await expect(customInput).toBeVisible({ timeout: 10000 });
            await customInput.clear();
            await customInput.fill(String(score));
            await customInput.press('Tab');
            await this.page.waitForTimeout(300);
        }
        console.log(`[Grading Page] Score ${score} set via ${scoreSet ? 'preset card' : 'custom input'} for criterion index ${criterionIndex}`);


        // Edit feedback via the edit (pencil) button
        const editBtn = section.locator('button._1iv3oxt3._1iv3oxt2').first();
        await expect(editBtn).toBeVisible({ timeout: 10000 });
        await editBtn.click();
        await this.page.waitForTimeout(200);

        const editable = this.page.locator('div[contenteditable="true"][spellcheck="false"]').first();
        await expect(editable).toBeVisible({ timeout: 10000 });
        await editable.click();
        await editable.fill(feedback);
        await this.page.waitForTimeout(300);

        const saveBtn = editable.locator('xpath=..').locator('button').nth(1);
        await saveBtn.click();
        await this.page.waitForTimeout(300);
    }*/

    async setCriterionResultByIndex(criterionIndex: number, score?: number, feedback?: string): Promise<void> {
        const section = this.page.locator('div.overflow-visible.rounded-lg.shadow-sm').nth(criterionIndex);

        if (score !== undefined) {
        // Always use custom score input — preset card clicks don't sync to custom input
        const customInput = section.locator('input[type="number"]').first();
        await expect(customInput).toBeVisible({ timeout: 10000 });
        await customInput.clear();
        await customInput.fill(String(score));
        await customInput.press('Tab');
        await this.page.waitForTimeout(300);
        console.log(`[Grading Page] Score ${score} set via custom input for criterion index ${criterionIndex}`);
        }

        if (feedback !== undefined) {
        // Edit feedback via the pencil button
        const editBtn = section.getByLabel('Edit feedback').first();
        await expect(editBtn).toBeVisible({ timeout: 10000 });
        await editBtn.click();
        await this.page.waitForTimeout(200);

        const editable = this.page.locator('div[contenteditable="true"][spellcheck="false"]').first();
        await expect(editable).toBeVisible({ timeout: 10000 });
        await editable.click();
        await editable.fill(feedback);
        await this.page.waitForTimeout(300);

        const saveBtn = section.getByLabel('Save edits').first();
        await saveBtn.click();
        await this.page.waitForTimeout(300);
        }
    }

    /**
     * Verifies teacher edits after all edits are applied.
     * Uses the same criterion index mapping as setCriterionResultByIndex.
     */
   /* async verifyTeacherEditsApplied(edits: CriterionEditEntry[]): Promise<void> {
        for (const edit of edits) {
            const scoreInput = this.page
                .locator('div.score-selection')
                .locator('input[placeholder="Enter score"]')
                .nth(edit.criterionIndex);

            await expect(scoreInput).toBeVisible({ timeout: 10000 });
            await expect(scoreInput).toHaveValue(String(edit.score), { timeout: 10000 });
            await scoreInput.click();
            await this.page.waitForTimeout(150);
            await this.page.keyboard.press('Tab');

            const focusedElement = this.page.locator(':focus');
            await expect(focusedElement).toBeVisible({ timeout: 5000 });

            const feedbackTextSpan = focusedElement.locator('xpath=following-sibling::span[1]');
            await expect(feedbackTextSpan).toContainText(edit.feedback, { timeout: 10000 });
        }
    }*/

    //New UI Update - Tusha
    /*async verifyTeacherEditsApplied(edits: CriterionEditEntry[]): Promise<void> {
        for (const edit of edits) {
            const section = this.page.locator('div.overflow-visible.rounded-lg.p-3.shadow-sm').nth(edit.criterionIndex);

            // Verify the selected card (border-blue-500) has the correct score
            const selectedCard = section.locator('div.border-blue-500');
            await expect(selectedCard).toBeVisible({ timeout: 10000 });

            const scoreDiv = selectedCard.locator('div.inline-flex.h-9.min-w-9');
            if (await scoreDiv.count() > 0) {
                await expect(scoreDiv).toHaveText(String(edit.score), { timeout: 10000 });
            } else {
                const customInput = selectedCard.locator('input[placeholder="Score"]');
                await expect(customInput).toHaveValue(String(edit.score), { timeout: 10000 });
            }

            // Verify feedback text appears in the feedback block
            const feedbackLocator = section.locator('div.pl-3.pr-3.pt-3.pb-3.min-h-16').first();
            await expect(feedbackLocator).toContainText(edit.feedback, { timeout: 10000 });
        }
    }*/

    //New UI Update - Tusha
    async verifyTeacherEditsApplied(edits: CriterionEditEntry[]): Promise<void> {
        for (const edit of edits) {
            const section = this.page.locator('div.overflow-visible.rounded-lg.shadow-sm').nth(edit.criterionIndex);

            if (edit.score !== undefined) {
            // Custom Score input always reflects the current score
            const customInput = section.locator('input[type="number"]').first();
            await expect(customInput).toBeVisible({ timeout: 10000 });
            await expect(customInput).toHaveValue(String(edit.score), { timeout: 10000 });
            console.log(`[Grading Page] Verified score ${edit.score} for criterion ${edit.criterionIndex}`);
            }

            if (edit.feedback !== undefined) {
            // Verify feedback
            const feedbackLocator = section.locator('div.flex.min-h-28.flex-col.gap-2').first();
            await expect(feedbackLocator).toContainText(edit.feedback, { timeout: 10000 });
            console.log(`[Grading Page] Verified feedback for criterion ${edit.criterionIndex}`);
            }
        }
    }

    /**
     * Applies teacher edits (score and/or feedback per criterion). Call after AI grades are visible, before publish.
     * Edits should already be filtered to valid criterion indices by the caller.
     */
    async applyTeacherEdits(edits: CriterionEditEntry[]): Promise<void> {
        if (!edits.length) return;
        console.log(`[Grading Page] Applying ${edits.length} teacher edit(s)...`);
        for (const edit of edits) {
            await this.setCriterionResultByIndex(edit.criterionIndex, edit.score, edit.feedback);
        }
        await this.verifyTeacherEditsApplied(edits);
        console.log('[Grading Page] Teacher edits applied.');
    }

    /**
     * Gets all criterion scores with their names, points, and feedback
     * @returns Array of CriterionScore objects
     */
  /*  async getAllCriteriaScores(): Promise<CriterionScore[]> {

        console.log("[Grading Page] Extracting all criteria scores and feedback...");
       
        // Wait for score-selection container to be visible
        const scoreSelectionContainer = this.page.locator('div.score-selection');
        await expect(scoreSelectionContainer).toBeVisible({ timeout: 30000 });
        
        const criteriaScores: CriterionScore[] = [];
        
        // Directly find all p tags that have a Customize button in the same container
        //const criterionPTags = scoreSelectionContainer.locator('xpath=.//div[contains(@class, "flex-col")][.//button[contains(text(), "Customize")]]/p');
        const criterionPTags = scoreSelectionContainer.locator('div.flex-col').filter({ 
            has: this.page.getByRole('button', { name: 'Customize' }) 
        }).locator('p');
        const criterionCount = await criterionPTags.count();
        console.log(`[Grading Page] Found ${criterionCount} criterion p tags with Customize buttons...`);

        for (let i = 0; i < criterionCount; i++) {
            const pTag = criterionPTags.nth(i);
            const criterionName = (await pTag.innerText()).trim();

            // Nearest div ancestor of this name <p> that also contains a score input (same row; every ancestor already contains the p).
            const rowContainer = pTag.locator(`xpath=ancestor::div[.//input[@type='number']][1]`);
            const scoreInput = rowContainer.locator('input[type="number"]').first();

            // Wait for Score
            try {
                await scoreInput.waitFor({ state: 'attached', timeout: 5000 });
                await expect(scoreInput).not.toHaveValue('', { timeout: 30000 });
            } catch (e) {
                console.log(`⚠️ Warning: Score not populated by AI in time for ${criterionName}.`);
            }
            const score = parseFloat(await scoreInput.inputValue());

            // 🎯 THE FIX: Wait for actual text content to appear in the feedback box
            const feedbackLocator = rowContainer.locator('div.pl-2.pt-2.pb-2.min-h-16').first();
            
            // This ensures we don't grab "N/A" or empty strings while the AI is thinking
            await expect(feedbackLocator).not.toHaveText('', { timeout: 20000 }); 
            
            const feedbackText = await feedbackLocator.innerText();
            console.log(`[DEBUG] Criterion: "${criterionName}" | Score: ${score} | Feedback length: ${feedbackText.length}`);

            // Attach to Allure (ensure this key matches your Modal logic)
            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: criterionName,
                criterion_feedback: feedbackText
            }));

            criteriaScores.push({
                name: criterionName,
                points: score,
                feedback: feedbackText.trim()
            });
        }
        
        console.log(`[Grading Page] Successfully extracted ${criteriaScores.length} criteria scores`);
        return criteriaScores;
    }*/

    //new UI update - Tusha
    async getAllCriteriaScores(): Promise<CriterionScore[]> {
        console.log("[Grading Page] Extracting all criteria scores and feedback...");

        const criterionSections = this.page.locator('div.overflow-visible.rounded-lg.shadow-sm');
        await expect(criterionSections.first()).toBeVisible({ timeout: 30000 });

        const criterionCount = await criterionSections.count();
        console.log(`[Grading Page] Found ${criterionCount} criterion sections...`);

        const criteriaScores: CriterionScore[] = [];

        for (let i = 0; i < criterionCount; i++) {
            const section = criterionSections.nth(i);

            // Criterion name
            const nameEl = section.locator('h3.text-lg.font-semibold.text-gray-900')
            const criterionName = (await nameEl.innerText()).trim();

            // Selected score card: blue (Ai score) or amber highlight (custome score)
            const blueCard = section.locator('div.border-blue-500');
            const amberCard = section.locator('div.border-amber-500');
            const blueCount = await blueCard.count();
            const amberCount = await amberCard.count();
            const selectedCard =
                blueCount > 0 ? blueCard.first() : amberCount > 0 ? amberCard.first() : null;

            let score = 0;
            if (selectedCard) {
                const scoreDiv = selectedCard.locator('div.relative.flex.h-7.w-7');
                if (await scoreDiv.count() > 0) {
                    const scoreText = (await scoreDiv.innerText()).trim();
                    score = parseFloat(scoreText) || 0;
                } else {
                    // Custom score input is selected
                    const customInput = selectedCard.locator('input[type="number"]');
                    const val = await customInput.inputValue();
                    score = parseFloat(val) || 0;
                }
            }

            // AI Feedback block
            const feedbackLocator = section.locator('div.flex.min-h-28.flex-col.gap-2').first();
            try {
                await expect(feedbackLocator).not.toHaveText('', { timeout: 60000 });
            } catch (e) {
                console.log(`⚠️ Warning: Feedback not populated in time for "${criterionName}".`);
            }
            const feedbackText = await feedbackLocator.innerText().catch(() => '');
            const normalizedFeedback = feedbackText
                .replace(/^AI FEEDBACK\s*/i, '')
                .trim();

            console.log(`[DEBUG] Criterion: "${criterionName}" | Score: ${score} | Feedback length: ${feedbackText.length}`);

            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: criterionName,
                criterion_feedback: normalizedFeedback
            }));

            criteriaScores.push({
                name: criterionName,
                points: score,
                feedback: normalizedFeedback
            });
        }

        console.log(`[Grading Page] Successfully extracted ${criteriaScores.length} criteria scores`);
        return criteriaScores;
    }

    async getGradingSummary(): Promise<GradingSummary> {
        console.log("[Grading Page] Generating complete grading summary...");
        
        // 1. Get total score
        const totalScore = await this.getTotalScore();
        
        // 2. Get all criteria scores
        const criteria = await this.getAllCriteriaScores();

        // 3. Get Overall Feedback text
        // Adjust this selector if your overall feedback isn't inside a span with text-primary-color
        const feedbackSections = await this.getAllFeedback();
        const overallFeedback = feedbackSections.length > 0 
            ? feedbackSections.join('\n\n') 
            : "No overall feedback recorded.";
        
        const summary: GradingSummary = {
            totalScore,
            criteria,
            overallFeedback 
        };
        
        return summary;
    }

    /**
     * Logs a formatted grading report to console and attaches to Allure
     * @param summary Optional GradingSummary to log. If not provided, will fetch it.
     */
    async logGradingReport(summary?: GradingSummary): Promise<void> {
        const gradingSummary = summary || await this.getGradingSummary();
        
        // Format report for console
        const reportLines: string[] = [];
        reportLines.push('='.repeat(80));
        reportLines.push('📊 POWERGRADER GRADING REPORT');
        reportLines.push('='.repeat(80));
        reportLines.push(`\n🎯 Total Score: ${gradingSummary.totalScore}`);
        reportLines.push(`\n📋 Criteria Breakdown (${gradingSummary.criteria.length} criteria):`);
        reportLines.push('-'.repeat(80));
        
        gradingSummary.criteria.forEach((criterion: CriterionScore, index: number) => {
            reportLines.push(`\n${index + 1}. ${criterion.name}`);
            reportLines.push(`   Points: ${criterion.points}`);
            reportLines.push(`   Feedback: ${criterion.feedback}`);
        });
        
        reportLines.push('\n' + '='.repeat(80));
        reportLines.push('✅ Grading Report Complete');
        reportLines.push('='.repeat(80));
        
        // Log to console
        console.log('\n' + reportLines.join('\n') + '\n');
        
        // Attach formatted text report to Allure
        await AllureHelper.attachText('Grading Report', reportLines.join('\n'));
        
        // Also attach as JSON for structured data
        await AllureHelper.attachJSON('Grading Report (JSON)', gradingSummary);
    }
}

