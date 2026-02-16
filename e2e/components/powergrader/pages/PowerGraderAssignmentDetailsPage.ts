import { expect, Page } from '@playwright/test';

export class PowerGraderAssignmentDetailsPage {
    page: Page;

    constructor(page: Page) {
        this.page = page;
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

    /*async clickViewButtonForStudent(studentEmail: string): Promise<void> {
        const studentEmailText = this.page.getByText(studentEmail, { exact: false }).first();
        await expect(studentEmailText).toBeVisible({ timeout: 30000 });
        
        const studentRow = studentEmailText.locator('xpath=ancestor::tr').first();
        const viewButton = studentRow.getByText('View', { exact: true }).first();
        
        await expect(viewButton).toBeVisible({ timeout: 10000 });
        await viewButton.click();
        
        await this.page.waitForTimeout(1000);
    }*/

    //Upate by Tusha
        /**
     * Handles the "No Rubric" banner by clicking Generate and polling for the 
     * Halted status to clear.
     */
    async handleNoRubricStateIfPresent(): Promise<void> {
        // Locator based on your screenshot's HTML structure
            const generateBtn = this.page.locator('button').filter({ hasText: 'Generate Compatible Rubric' });
            const errorBanner = this.page.getByText("There is currently no rubric. We can't begin grading without one.");
            const haltedBadge = this.page.getByText('Grading Halted, No Rubric');

            if (await generateBtn.isVisible({ timeout: 5000 })) {
                console.log("[Details Page] 'No Rubric' banner detected. Triggering Generation...");
                
                await generateBtn.click();

                // Polling: We must reload and wait for the Halted badge to disappear
                // because the AI needs time to create the rubric criteria.
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
        // 1. First, check and handle the No Rubric/Halted state if it exists
        // This method now includes the internal polling we discussed
        await this.handleNoRubricStateIfPresent();

        // 2. Locate the specific student row
        const studentRow = this.page.locator('div, tr').filter({ hasText: studentEmail }).last();
        await expect(studentRow).toBeVisible({ timeout: 30000 });

        // 3. Find the action button/link. 
        // UPDATED: Catch the <a> tag (blue eye icon) or <button> specifically using a flexible regex
        const actionButton = studentRow.locator('button, a').filter({ hasText: /View|Grade Now|Start Reviewing/i }).first();

        // 4. Actionability check: Scroll and Click
        // BUMPED: Increased timeout to 30s to allow for AI processing to fully clear
        await expect(actionButton).toBeVisible({ timeout: 30000 });
        await actionButton.scrollIntoViewIfNeeded();
        
        const label = await actionButton.innerText();
        console.log(`[Details Page] Final state reached. Clicking "${label.trim()}" for ${studentEmail}`);
        
        await actionButton.click();
        await this.page.waitForLoadState('networkidle');
    }
}

