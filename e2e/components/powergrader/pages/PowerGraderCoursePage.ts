import { expect, Page } from '@playwright/test';

export class PowerGraderCoursePage {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        await this.page.waitForTimeout(1000);
    }

    async expectCoursePageLoaded(): Promise<void> {
        await this.waitForLoad();
    }

    async clickViewButtonForAssignment(assignmentTitle: string): Promise<void> {
        const assignmentText = this.page.getByText(assignmentTitle, { exact: false }).first();
        await expect(assignmentText).toBeVisible({ timeout: 30000 });
        
        const tableRow = assignmentText.locator('xpath=ancestor::tr').first();
        const viewButton = tableRow.getByRole('button', { name: 'View' }).first();
        
        await expect(viewButton).toBeVisible({ timeout: 10000 });
        
        await Promise.all([
            this.page.waitForURL(/\/assignments\/RegisterAssignmentPublicUUID--/, { timeout: 30000 }),
            viewButton.click()
        ]);
        
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    }

}

