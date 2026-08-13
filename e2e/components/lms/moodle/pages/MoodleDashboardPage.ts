import { expect, Page, Locator } from '@playwright/test';

export class MoodleDashboardPage {
    page: Page;
    dashboardContent: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dashboardContent = page.locator('body');
    }

    async goto(baseURL: string): Promise<void> {
        await this.page.goto(`${baseURL}/my`, { waitUntil: 'domcontentloaded' });
        await this.waitForLoad();
    }

    async waitForLoad(): Promise<void> {
        // Wait for dashboard to load - check for URL pattern
        await this.page.waitForURL(/\/my/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        // Wait a bit for content to render
        await this.page.waitForTimeout(1000);
    }

    async expectDashboardLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/my/);
        // Verify we're not on login page
        const currentURL = this.page.url();
        if (currentURL.includes('/login')) {
            throw new Error('Still on login page. Dashboard not loaded.');
        }
        // Check for dashboard content
        await expect(this.dashboardContent).toBeVisible({ timeout: 10000 });
    }

    async selectCourse(courseName: string): Promise<void> {
        await this.waitForLoad();

        await this.page.getByRole('menuitem', { name: 'My courses' }).click();

        await this.page.waitForURL(/\/my\/courses\.php/, { timeout: 30000 });
        await expect(this.page.getByRole('heading', { name: 'My courses' })).toBeVisible({ timeout: 30000 });

        const courseLink = this.page.locator('a').filter({ hasText: courseName }).first();
        await expect(courseLink, `Course "${courseName}" not found on My courses page`).toBeVisible({ timeout: 30000 });
        await courseLink.click();

        await this.page.waitForURL(/\/course\/view\.php\?id=\d+/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.page.getByRole('heading', { name: courseName })).toBeVisible({ timeout: 30000 });
    }
}

