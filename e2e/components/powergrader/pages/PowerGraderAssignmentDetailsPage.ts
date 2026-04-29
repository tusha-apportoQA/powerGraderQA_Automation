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
       const actionButton = studentRow.getByText('View details', { exact: true }).first();

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

