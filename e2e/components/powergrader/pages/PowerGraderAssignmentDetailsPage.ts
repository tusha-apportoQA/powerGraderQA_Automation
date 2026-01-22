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

    async clickViewButtonForStudent(studentEmail: string): Promise<void> {
        const studentEmailText = this.page.getByText(studentEmail, { exact: false }).first();
        await expect(studentEmailText).toBeVisible({ timeout: 30000 });
        
        const studentRow = studentEmailText.locator('xpath=ancestor::tr').first();
        const viewButton = studentRow.getByText('View', { exact: true }).first();
        
        await expect(viewButton).toBeVisible({ timeout: 10000 });
        await viewButton.click();
        
        await this.page.waitForTimeout(1000);
    }
}

