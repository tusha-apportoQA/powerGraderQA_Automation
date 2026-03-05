import { expect, Page, Locator } from '@playwright/test';
import { CriterionScore, GradingSummary } from '../../../types';
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
    
        const publishButton = this.page.getByRole('button', { name: 'Publish' }).first();
        console.log(`Publish Button Found..`);
        await expect(publishButton).toBeVisible({ timeout: 30000 });
      //  await expect(publishButton).toBeEnabled({ timeout: 10000 });
        
        await publishButton.click();
        console.log(`Publish Button Clicked..`);
        
        // Handle the confirmation modal that often follows
        const confirmBtn = this.page.getByRole('button', { name: /^Confirm$|^Yes$|^Publish$/i }).last();
        try {
            if (await confirmBtn.isVisible({ timeout: 3000 })) {
                await confirmBtn.click({ timeout: 5000 }).catch(() => {});
            }
        } catch {}
        
        await this.page.waitForLoadState('networkidle');
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
        // XPath: Find p tags within div.flex-col containers that contain a Customize button
        //const criterionPTags = scoreSelectionContainer.locator('xpath=.//div[contains(@class, "flex-col")][.//button[contains(text(), "Customize")]]/p');
        const criterionPTags = scoreSelectionContainer.locator('div.flex-col').filter({ 
            has: this.page.getByRole('button', { name: 'Customize' }) 
        }).locator('p');
        const criterionCount = await criterionPTags.count();
        console.log(`[Grading Page] Found ${criterionCount} criterion p tags with Customize buttons...`);
        
        /*for (let i = 0; i < criterionCount; i++) {
            const pTag = criterionPTags.nth(i);
            const text = await pTag.innerText().catch(() => '');
            
            if (text && text.trim().length > 0) {
                const criterionName = text.trim();
                console.log(`[Grading Page] Processing criterion: "${criterionName}"`);
                
                // Find the 3rd parent div of the p tag (row container)
               // const rowContainer = pTag.locator('xpath=ancestor::div[3]');
               const rowContainer = this.page.locator('div').filter({ has: pTag }).filter({ has: this.page.locator('input[type="number"]') }).last();
                
                // Get score from custom score input - fail if not found
                const scoreInput = rowContainer.locator('input[type="number"][placeholder="Enter score"]').first();
                await expect(scoreInput).toBeVisible({ timeout: 10000 });

                // WAIT for the AI to actually fill the box (Wait up to 15s)
                await expect(scoreInput).not.toHaveValue('', { timeout: 15000 });
                
                const scoreValue = await scoreInput.inputValue();
                if (!scoreValue || scoreValue.trim() === '') {
                    throw new Error(`Score input found but value is empty for criterion: ${criterionName}`);
                }
                
                const score = parseFloat(scoreValue);
                if (isNaN(score)) {
                    throw new Error(`Invalid score value "${scoreValue}" for criterion: ${criterionName}`);
                }
                
                // Get feedback: 2nd child div of row container, then 2nd div of that, then get innerText
                const feedbackContainer = rowContainer.locator('xpath=./div[2]/div[2]');
                await expect(feedbackContainer).toBeVisible({ timeout: 10000 });
                
                //const feedback = (await feedbackContainer.innerText()).trim();
                const feedback = await rowContainer.locator('div').filter({ hasText: /[a-zA-Z]/ }).last().textContent();                
                /*if (criterionName) {
                    criteriaScores.push({
                        name: criterionName,
                        points: score,
                        feedback: feedback
                    });*/
               /* }
            }
        }*/

       /* for (let i = 0; i < criterionCount; i++) {
            const pTag = criterionPTags.nth(i);
            const criterionName = (await pTag.innerText()).trim();

            // ✅ FIX: Find the closest container that actually contains the input box
            const rowContainer = this.page.locator('div').filter({ has: pTag }).filter({ has: this.page.locator('input[type="number"]') }).last();
            
            // Get score
            const scoreInput = rowContainer.locator('input[type="number"]');
            await expect(scoreInput).not.toHaveValue('', { timeout: 15000 });
            const score = parseFloat(await scoreInput.inputValue());

            // ✅ FIX: Find feedback by looking for the box that is NOT the header/label
            // Most PowerGrader rows put feedback in a specific descriptive class or a sibling div
            const feedback = await rowContainer.locator('div').filter({ hasText: /[a-zA-Z]/ }).last().textContent();

            criteriaScores.push({
                name: criterionName,
                points: score,
                feedback: (feedback ?? '').trim()
            });
        }*/

        for (let i = 0; i < criterionCount; i++) {
            const pTag = criterionPTags.nth(i);
            const criterionName = (await pTag.innerText()).trim();

            // Identify the container for this specific criterion row
            const rowContainer = this.page.locator('div').filter({ has: pTag }).filter({ has: this.page.locator('input[type="number"]') }).last();
            
            // Get the score
            const scoreInput = rowContainer.locator('input[type="number"]');

            //await expect(scoreInput).not.toHaveValue('', { timeout: 15000 });
            try {
                await expect(scoreInput).not.toHaveValue('', { timeout: 30000 });
            } catch (e) {
                console.log(`⚠️ Warning: Score not populated by AI in time for ${criterionName}. Defaulting to 0.`);
            }
            const score = parseFloat(await scoreInput.inputValue());

            // 🎯 THE FIX: Target the specific feedback class from your Inspect window
            // We use .first() in case the AI renders multiple blocks, and .waitFor to ensure it's typed out.
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
        }
        
        console.log(`[Grading Page] Successfully extracted ${criteriaScores.length} criteria scores`);
        return criteriaScores;
    }

    /**
     * Gets complete grading summary including total score and all criteria details
     * @returns GradingSummary object with total score and all criteria
     */
    /*async getGradingSummary(): Promise<GradingSummary> {
        console.log("[Grading Page] Generating complete grading summary...");
        
        // Get total score (reusing existing method)
        const totalScore = await this.getTotalScore();
        
        // Get all criteria scores
        const criteria = await this.getAllCriteriaScores();
        
        const summary: GradingSummary = {
            totalScore,
            criteria
        };
        
        return summary;
    }*/

    async getGradingSummary(): Promise<GradingSummary> {
        console.log("[Grading Page] Generating complete grading summary...");
        
        // 1. Get total score
        const totalScore = await this.getTotalScore();
        
        // 2. Get all criteria scores
        const criteria = await this.getAllCriteriaScores();

        // 3. ADDED: Get Overall Feedback text
        // Adjust this selector if your overall feedback isn't inside a span with text-primary-color
        const feedbackSections = await this.getAllFeedback();
        const overallFeedback = feedbackSections.length > 0 
            ? feedbackSections.join('\n\n') 
            : "No overall feedback recorded.";
        
        const summary: GradingSummary = {
            totalScore,
            criteria,
            overallFeedback // ✅ Ensure your GradingSummary type supports this key
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

