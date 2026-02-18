import { expect, Page } from '@playwright/test';

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
        const totalGradeHeader = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[1]/div[2]/div[1]/h2');
        await expect(totalGradeHeader).toContainText('/', { timeout: 60000 });

        const criteriaContent = this.page.locator('xpath=/html/body/div[3]/div[2]/div/div/div/div/div[3]/div/div/div[2]/div[1]/div/div/div/div/div[1]/div[2]');
        await expect(criteriaContent).toBeVisible({ timeout: 20000 });
        /*const totalGradeHeader = this.page.locator('h2').filter({ hasText: /\// });
        await expect(totalGradeHeader).toBeVisible({ timeout: 30000 });
        await expect(totalGradeHeader).toContainText('/', { timeout: 30000 });
        const criteriaContent = this.page.locator('div').filter({ hasText: /^Criteria$/i }).first();
        await expect(criteriaContent).toBeVisible({ timeout: 20000 });*/
        
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
    async getAllFeedback(): Promise<string[]> {
        const feedbackSections = this.page.locator('span[class*="text-primary-color"]');
        return await feedbackSections.allInnerTexts();
    }

    /*async clickPublishButton(): Promise<void> {
        const publishButton = this.page.getByRole('button', { name: 'Publish' }).first();
        await expect(publishButton).toBeVisible({ timeout: 30000 });
        await expect(publishButton).toBeEnabled({ timeout: 10000 });
        await publishButton.click();
        await this.page.waitForTimeout(1000);
    }*/
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
        if (await confirmBtn.isVisible({ timeout: 3000 })) {
            await confirmBtn.click();
        }
        
        await this.page.waitForLoadState('networkidle');
    }
}

