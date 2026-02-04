import { expect, Page } from '@playwright/test';

export class PowerGraderGradingPage {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        await this.page.waitForTimeout(1000);
    }

    async expectPageLoaded(studentName?: string): Promise<void> {
        await expect(this.page).toHaveURL(/\/RegisterSubmissionPublicUUID--/, { timeout: 30000 });
        if (studentName) {
            const studentNameElement = this.page.getByText(studentName, { exact: false }).first();
            await expect(studentNameElement).toBeVisible({ timeout: 30000 });
        }
    }

    async clickPublishButton(): Promise<void> {
        const publishButton = this.page.getByRole('button', { name: 'Publish' }).first();
        await expect(publishButton).toBeVisible({ timeout: 30000 });
        await expect(publishButton).toBeEnabled({ timeout: 10000 });
        await publishButton.click();
        await this.page.waitForTimeout(1000);
    }
}

