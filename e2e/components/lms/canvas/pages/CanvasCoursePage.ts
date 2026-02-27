import { expect, Page, Locator } from '@playwright/test';

export class CanvasCoursePage {
    page: Page;
    assignmentsLink: Locator;
    powergraderQALink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.assignmentsLink = page.locator('id=assignments-link');
       // this.powergraderQALink = page.locator('id=powergrader-qa-link');
        this.powergraderQALink = this.page.getByRole('link', { name: /Powergrader QA/i });
    }

    async waitForLoad(): Promise<void> {
        await this.assignmentsLink.waitFor({ state: 'visible', timeout: 30000 });
    }

    async expectCoursePageLoaded(): Promise<void> {
        await expect(this.assignmentsLink).toBeVisible();
        await expect(this.page).toHaveURL(/\/courses\/\d+/);
    }

    async clickAssignments(): Promise<void> {
        await expect(this.assignmentsLink).toBeVisible();
        await this.assignmentsLink.click();

        await this.page.waitForURL(/\/courses\/\d+\/assignments/, { timeout: 30000 });
        await this.page.waitForLoadState();
    }

    /**
     * Click on Powergrader QA link to navigate to PowerGrader
     * Note: Opens in a new tab (target="_blank")
     * @returns {Promise<Page>} The new page/tab that opens (PowerGrader page)
     */
    async clickPowergraderQA(): Promise<Page> {
        await expect(this.powergraderQALink).toBeVisible({ timeout: 30000 });

        const [newPage] = await Promise.all([
            this.page.context().waitForEvent('page'),
            this.powergraderQALink.click()
        ]);

        await newPage.waitForLoadState('domcontentloaded');
        return newPage;
    }
}
