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
        const studentRow = this.page.locator('div, tr').filter({ hasText: studentEmail }).last();
        await expect(studentRow).toBeVisible({ timeout: 30000 });
        const actionButton = studentRow.locator('button, a').filter({ hasText: /View|Grade Now|Start Reviewing/i }).first();

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
        console.log("[Details Page] 'See Why' located.");
        const seeWhyBtn = this.page.getByRole('button', { name: /See Why/i });
        
        // Ensure it's visible before clicking
        //await expect(seeWhyBtn).toBeVisible({ timeout: 10000 });
        await seeWhyBtn.click({ force: true });
       
        console.log("[Details Page] 'See Why' clicked successfully.");
    }

    /**
     * Clicks 'Grade Anyway' inside the incompatibility modal. Update by Tusha
     */
    async clickGradeAnyway(): Promise<void> {
        const gradeAnywayBtn = this.page.getByRole('button', { name: /Grade Anyway/i });
        await gradeAnywayBtn.waitFor({ state: 'visible', timeout: 10000 });
        //Perform the click
        await gradeAnywayBtn.click({ force: true });
        console.log("[Details Page] 'Grade Anyway' clicked successfully.");
    }
}

