import { expect, Page, Locator } from '@playwright/test';

export class MoodleDashboardPage {
    page: Page;
    dashboardContent: Locator;
    availableCoursesHeading: Locator;
    courseLinks: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dashboardContent = page.locator('body');
        this.availableCoursesHeading = page.getByRole('heading', { name: /available courses/i });
        this.courseLinks = page.locator('a[href*="/course/view.php"]');
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

        // Dashboard: each course is a listitem whose element has data-course-id on it (same node).
        // Find that listitem that contains the course name (exact), then click its first "Course image" link.
        const courseListItem = this.page
            .locator('[role="listitem"][data-course-id]')
            .filter({ has: this.page.getByText(courseName, { exact: true }) })
            .first();

        await expect(courseListItem, `Course "${courseName}" not found on dashboard`).toBeVisible({ timeout: 30000 });

        const courseImageLink = courseListItem.getByRole('link', { name: 'Course image' }).first();
        await expect(courseImageLink).toBeVisible({ timeout: 10000 });
        await courseImageLink.click();

        await this.page.waitForURL(/\/course\/view\.php\?id=\d+/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }
}

