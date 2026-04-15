import { expect, Page, Locator } from '@playwright/test';

export class D2LAssignmentListPage {
    page: Page;
    pageTitle: Locator;
    newAssignmentButton: Locator;
    assignmentsGrid: Locator;
    newAssignmentHeading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageTitle = page.getByRole('heading', { name: 'Assignments', exact: true });
        this.newAssignmentButton = page.getByRole('button', { name: 'New Assignment' , exact: true})
        this.assignmentsGrid = page.locator('table.d2l-grid');
        this.newAssignmentHeading = page.getByRole('heading', { name: 'New Assignment' });
    }

    async waitForLoad(): Promise<void> {
        await expect(this.pageTitle).toBeVisible({ timeout: 30000 });
    }

    async expectAssignmentListPageLoaded(): Promise<void> {
        await expect(this.pageTitle).toBeVisible();
        try {
            await expect(this.newAssignmentButton).toBeVisible({ timeout: 2000 });
        } catch {
            // Expected for student role
        }
        await expect(this.page).toHaveURL(/\/d2l\/lms\/dropbox/);
    }


    async clickNewAssignment(): Promise<void> {
        await this.waitForLoad();
        
        await expect(this.newAssignmentButton).toBeVisible({ timeout: 10000 });
        await expect(this.newAssignmentButton).toBeEnabled({ timeout: 5000 });
        
        await this.newAssignmentButton.scrollIntoViewIfNeeded();
        
        await this.newAssignmentButton.click({ timeout: 10000, noWaitAfter: true });

        await expect(this.newAssignmentHeading).toBeVisible({ timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    async clickAssignment(assignmentName: string): Promise<void> {
        await this.waitForLoad();

        let assignmentLink = this.assignmentsGrid
            .getByRole('link', { name: assignmentName })
            .first();
        
        let isVisible = false;
        try {
            await expect(assignmentLink).toBeVisible({ timeout: 5000 });
            isVisible = true;
        } catch {
            isVisible = false;
        }

        if (!isVisible) {
            let nextPageButton = this.page.getByRole('button', { name: 'Next Page' });
            
            while (true) {
                const nextPageVisible = await nextPageButton.isVisible({ timeout: 2000 }).catch(() => false);
                
                if (!nextPageVisible) {
                    throw new Error(`Assignment "${assignmentName}" not found in any page of the assignment list`);
                }

                await nextPageButton.click();
                await this.page.waitForLoadState('domcontentloaded');
                await this.page.waitForTimeout(1000);
                
                await this.waitForLoad();
                await expect(this.assignmentsGrid).toBeVisible({ timeout: 10000 });
                
                assignmentLink = this.assignmentsGrid
                    .getByRole('link', { name: assignmentName })
                    .first();
                
                try {
                    await expect(assignmentLink).toBeVisible({ timeout: 5000 });
                    isVisible = true;
                    break;
                } catch {
                    nextPageButton = this.page.getByRole('button', { name: 'Next Page' });
                }
            }
        }

        await assignmentLink.click();
        await this.page.waitForLoadState('domcontentloaded');
    }

}

