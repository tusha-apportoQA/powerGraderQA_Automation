import { expect, Page, Locator } from '@playwright/test';
import { CriterionScore, CriterionEditEntry, GradingSummary } from '../../../types';
import { AllureHelper } from '../../../utils/allureHelper';

export class PowerGraderGradingPage {
    page: Page;

    constructor(page: Page) {
        this.page = page;
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
    async verifyGradesAndFeedbackPopulated(): Promise<void> {
        console.log("[Grading Page] Verifying AI Grades data is present...");
        // Just verify the element is visible and populated without logging it here
        //const totalGradeHeader = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[1]/div[2]/div[1]/h2');
        const totalGradeHeader = this.page.locator('h2').filter({ hasText: /\// });
        await expect(totalGradeHeader).toContainText('/', { timeout: 60000 });

        const criteriaContent = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[2]/div[1]/div/div/div/div/div[1]/div[2]');
        await expect(criteriaContent).toBeVisible({ timeout: 20000 });
        
        console.log("[Grading Page] AI Results verified successfully.");
        }
    
    //Update by Tusha
    async getTotalScore(): Promise<string> {
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
    }

    async getIndividualScore(): Promise<string> {
        const scoreInput = this.page.locator('input[placeholder="Enter score"]').first();
        return await scoreInput.inputValue();
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
        await this.page.waitForTimeout(30000);

        const publishButton = this.page.getByRole('button', { name: 'Publish' }).first();
        console.log(`Publish Button Found..`);
        await expect(publishButton).toBeVisible({ timeout: 30000 });
        await expect(publishButton).toBeEnabled({ timeout: 10000 });
        
        await publishButton.click();
        console.log(`Publish Button Clicked..`);

        const certifyCheckbox = this.page.getByRole('checkbox', {
            name: /I certify this grade can be released to the student/i
        });
        try {
            if (await certifyCheckbox.isVisible({ timeout: 3000 })) {
                await certifyCheckbox.check();
                const studentCommentInput = this.page.getByRole('textbox', {
                    name: 'Add a comment to the student'
                });
                await expect(studentCommentInput).toBeVisible({ timeout: 10000 });
                await studentCommentInput.fill('feedback');
                await this.page.waitForTimeout(300);
                const modalPublishButton = this.page.getByRole('button', { name: 'Publish' }).last();
                await expect(modalPublishButton).toBeVisible({ timeout: 10000 });
                await expect(modalPublishButton).toBeEnabled({ timeout: 10000 });
                await modalPublishButton.click();
                console.log(`Certification modal handled and final publish clicked..`);
            }
        } catch {}
        
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Sets score and feedback for a single criterion by 0-based index (teacher edit).
     * Score and feedback are required so we always start from the score input; Tab then focuses the edit-feedback button.
     */
    async setCriterionResultByIndex(criterionIndex: number, score: number, feedback: string): Promise<void> {
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
    }

    /**
     * Verifies teacher edits after all edits are applied.
     * Uses the same criterion index mapping as setCriterionResultByIndex.
     */
    async verifyTeacherEditsApplied(edits: CriterionEditEntry[]): Promise<void> {
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
    async getAllCriteriaScores(): Promise<CriterionScore[]> {

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


       /* for (let i = 0; i < criterionCount; i++) {
            const pTag = criterionPTags.nth(i);
            const criterionName = (await pTag.innerText()).trim();

            // Identify the container for this specific criterion row
            const rowContainer = this.page.locator('div').filter({ has: pTag }).filter({ has: this.page.locator('input[type="number"]') }).last();
            
            // Get the score
            const scoreInput = rowContainer.locator('input[type="number"]');
            try {
                await expect(scoreInput).not.toHaveValue('', { timeout: 30000 });
            } catch (e) {
                console.log(`⚠️ Warning: Score not populated by AI in time for ${criterionName}. Defaulting to 0.`);
            }
            const score = parseFloat(await scoreInput.inputValue());

            console.log(`[DEBUG] Criterion: "${criterionName}" | Scraped Score: ${score}`);

            const feedbackLocator = rowContainer.locator('div.pl-2.pt-2.pb-2.min-h-16').first();
            //console.log(`Feedback Locator: ${feedbackLocator}`);
            const feedbackText = await feedbackLocator.innerText();
            await feedbackLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}); 
            
            const feedback = await feedbackLocator.innerText().catch(() => 'No feedback found');
            console.log(`Feedback: ${feedbackText.substring(0, 50)}...`);

            await AllureHelper.attachText('student-feedback', JSON.stringify({
                criterion_name: criterionName,
                criterion_feedback: feedbackText
            }));


            criteriaScores.push({
                name: criterionName,
                points: score,
                feedback: feedback.trim()
            });
        }*/

        for (let i = 0; i < criterionCount; i++) {
            const pTag = criterionPTags.nth(i);
            const criterionName = (await pTag.innerText()).trim();

            const rowContainer = this.page.locator('div').filter({ has: pTag }).filter({ has: this.page.locator('input[type="number"]') }).last();
            //const scoreInput = rowContainer.locator('input[type="number"]');
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

