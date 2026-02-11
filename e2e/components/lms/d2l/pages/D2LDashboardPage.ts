import { expect, Page, Locator } from '@playwright/test';

export class D2LDashboardPage {
    page: Page;
    myCoursesHeading: Locator;
    courseCards: Locator;

    constructor(page: Page) {
        this.page = page;
        this.myCoursesHeading = page.getByRole('heading', { name: 'My Courses', exact: true });
        this.courseCards = page.locator('d2l-enrollment-card');
    }

    async goto(baseURL: string): Promise<void> {
        await this.page.goto(`${baseURL}/d2l/home`, { waitUntil: 'domcontentloaded' });
        await this.waitForLoad();
    }

    async waitForLoad(): Promise<void> {
        await expect(this.myCoursesHeading).toBeVisible({ timeout: 30000 });
        await this.courseCards.first().waitFor({ state: 'visible', timeout: 30000 });
    }

    async expectDashboardLoaded(): Promise<void> {
        await expect(this.myCoursesHeading).toBeVisible();
        await expect(this.page).toHaveURL(/\/d2l\/home/);
    }


    async selectCourse(courseName: string): Promise<void> {
        await this.waitForLoad();

        const courseCard = this.courseCards.filter({
            has: this.page.locator('d2l-organization-name').filter({
                hasText: new RegExp(courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            })
        }).first();

        await expect(courseCard, `Course "${courseName}" not found on dashboard`).toBeVisible({ timeout: 30000 });

        const courseLink = courseCard.getByRole('link').first();
        await expect(courseLink).toBeVisible();
        await courseLink.click();

        await this.page.waitForURL(/\/d2l\/home\/\d+/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }
}

