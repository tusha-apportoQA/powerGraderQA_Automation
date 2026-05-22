import { expect, Page, Locator } from '@playwright/test';

export class CanvasDashboardPage {
    page: Page;
    dashboardHeader: Locator;
    courseCardContainer: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dashboardHeader = page.getByRole('heading', { name: 'Dashboard' });
        this.courseCardContainer = page.locator('[data-testid="draggable-card"]');
    }

    async goto(baseURL: string): Promise<void> {
        await this.page.goto(`${baseURL}/?login_success=1`, { waitUntil: 'domcontentloaded' });
        await this.page.waitForLoadState('networkidle');
        await this.waitForLoad();
    }

    /*async goto(baseURL: string): Promise<void> {
        await this.page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
        await this.page.waitForLoadState('networkidle');
        await this.waitForLoad();
    }*/

    async waitForLoad(): Promise<void> {
        await expect(this.dashboardHeader).toBeVisible({ timeout: 30000 });
        await this.courseCardContainer.first().waitFor({ state: 'visible', timeout: 30000 });
    }

    /*async waitForLoad(): Promise<void> {
        try {
            await expect(this.dashboardHeader).toBeVisible({ timeout: 15000 });
        } catch {
            // Dashboard heading not found, try navigating directly
            await this.page.goto(`${this.page.url().split('/').slice(0, 3).join('/')}/dashboard`, { waitUntil: 'domcontentloaded' });
            await expect(this.dashboardHeader).toBeVisible({ timeout: 30000 });
        }
        await this.courseCardContainer.first().waitFor({ state: 'visible', timeout: 30000 });
    }*/

    async expectDashboardLoaded(): Promise<void> {
        await expect(this.dashboardHeader).toBeVisible();
        await expect(this.page).toHaveURL(/\/\?login_success=1|\/dashboard/);
       // await expect(this.page).toHaveURL(/\/dashboard/);

    }

    async selectCourse(courseName: string): Promise<void> {
        await this.waitForLoad();

        const courseCardTitle = this.page.getByTestId('dashboard-card-title').filter({
            hasText: new RegExp(courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        }).first();

        try {
            await expect(courseCardTitle).toBeVisible({ timeout: 30000 });
        } catch (error) {
            throw new Error(`Course "${courseName}" not found on dashboard. Please check the course name in configuration.`);
        }

        const courseLink = courseCardTitle.locator('xpath=ancestor::a[contains(@class, "ic-DashboardCard__link")]').first();
        await expect(courseLink).toBeVisible();
        await courseLink.click();

        await this.page.waitForURL(/\/courses\/\d+$/, { timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
    }
}
