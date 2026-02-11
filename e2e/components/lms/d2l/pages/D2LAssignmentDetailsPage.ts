import { expect, Page, Locator } from '@playwright/test';
import { FormatType } from '../../../../types';

export class D2LAssignmentDetailsPage {
    page: Page;
    assignmentTitle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.assignmentTitle = page.locator('h1.d2l-heading-1, h1.d2l-heading-2, h1').first();
    }

    async waitForLoad(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    async expectAssignmentDetailsLoaded(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible();
        await expect(this.page).toHaveURL(/\/d2l\/lms\/dropbox\/user\/submission_user_attempt\.d2l/);
    }

    async verifyAssignmentTitle(expectedTitle: string): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
        const titleText = await this.assignmentTitle.textContent();
        if (!titleText || !titleText.includes(expectedTitle)) {
            throw new Error(`Expected assignment title to contain "${expectedTitle}", but found "${titleText}"`);
        }
    }
}

