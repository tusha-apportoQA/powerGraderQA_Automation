import { expect, Page, Locator } from '@playwright/test';

export class D2LCoursePage {
    page: Page;
    navigationBar: Locator;
    assignmentsLink: Locator;
    contentLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.navigationBar = page.locator('.d2l-navigation-s-main-wrapper');
        this.assignmentsLink = this.navigationBar.getByRole('link', { name: 'Assignments' });
        this.contentLink = this.navigationBar.getByRole('link', { name: 'Content' });
    }

    async waitForLoad(): Promise<void> {
        await expect(this.navigationBar).toBeVisible({ timeout: 30000 });
        await this.assignmentsLink.waitFor({ state: 'visible', timeout: 30000 });
    }

    async expectCoursePageLoaded(): Promise<void> {
        await expect(this.navigationBar).toBeVisible();
        await expect(this.page).toHaveURL(/\/d2l\/home\/\d+$/);
    }


    async clickAssignments(): Promise<void> {
        await this.waitForLoad();
        await expect(this.assignmentsLink).toBeVisible({ timeout: 10000 });
        await this.assignmentsLink.click();
        
        await this.page.waitForURL(/\/d2l\/lms\/dropbox/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    async clickContent(): Promise<void> {
        await this.waitForLoad();
        await expect(this.contentLink).toBeVisible({ timeout: 30000 });
        await this.contentLink.click();
        
        await this.page.waitForURL(/\/d2l\/le\/content/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    async clickPowerGraderQATool(): Promise<Page> {
        const powerGraderLink = this.page.getByRole('link', { 
            name: 'PowerGrader QA Tool',
            exact:true
        });
        
        await expect(powerGraderLink).toBeVisible({ timeout: 60000 });

        const [newPage] = await Promise.all([
            this.page.context().waitForEvent('page'),
            powerGraderLink.click()
        ]);

        await newPage.waitForLoadState('domcontentloaded');
        return newPage;
    }
}

