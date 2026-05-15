import { expect, Page, Locator } from '@playwright/test';

export class D2LAssignmentListPage {
    page: Page;
    pageTitle: Locator;
    newAssignmentButton: Locator;
    assignmentsGrid: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageTitle = page.getByRole('heading', { name: 'Assignments', exact: true });
        this.newAssignmentButton = page.getByRole('button', { name: 'New Assignment' , exact: true})
        this.assignmentsGrid = page.locator('table.d2l-grid');
    }

    async waitForLoad(): Promise<void> {
        await expect(this.pageTitle).toBeVisible({ timeout: 30000 });
    }

    /**
     * D2L list pages allow changing "items per page" (e.g. 10/20/50/100/200).
     * This reduces paging complexity for find-by-name/deletion flows.
     */
    async setAssignmentsPerPage(perPage: number = 200): Promise<void> {
        const combobox = this.page.getByRole('combobox', { name: 'Results Per Page' })

        // If D2L UI doesn't render the combobox for some roles/states, just skip.
        const isVisible = await combobox.isVisible({ timeout: 5000 }).catch(() => false);
        if (!isVisible) return;

        const currentValue = await combobox.inputValue().catch(() => '');
        if (currentValue === String(perPage)) return;

        await combobox.selectOption({ value: String(perPage) });

        await this.page.waitForLoadState('load', { timeout: 60000 });
        await this.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    }

    async expectAssignmentListPageLoaded(): Promise<void> {
        await expect(this.pageTitle).toBeVisible();
        try {
            await expect(this.newAssignmentButton).toBeVisible({ timeout: 2000 });
        } catch {
            // Expected for student role
        }
        await expect(this.page).toHaveURL(/\/d2l\/lms\/dropbox/);
        await this.setAssignmentsPerPage(200);
    }


    async clickNewAssignment(): Promise<void> {
        await this.waitForLoad();
        
        await expect(this.newAssignmentButton).toBeVisible({ timeout: 10000 });
        await expect(this.newAssignmentButton).toBeEnabled({ timeout: 5000 });
        
        await this.newAssignmentButton.scrollIntoViewIfNeeded();
        
        await this.newAssignmentButton.click({ timeout: 10000});

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

    /**
     * Bulk delete: select each assignment by checkbox, then More Actions → Delete → confirm once.
     */
    async deleteAssignmentsByNames(assignmentNames: string[]): Promise<void> {
        if (assignmentNames.length === 0) {
            return;
        }

        await this.waitForLoad();
        await expect(this.assignmentsGrid).toBeVisible({ timeout: 10000 });

        for (const name of assignmentNames) {
            const checkbox = this.page.getByRole('checkbox', { name: `Select ${name}` }).first();
            await expect(checkbox).toBeVisible({ timeout: 30000 });
            await checkbox.check();
        }

        const moreActions = this.page.getByText('More Actions', { exact: true });
        await expect(moreActions).toBeVisible({ timeout: 30000 });
        await moreActions.click();

        const deleteMenuItem = this.page.getByRole('menuitem', { name: 'Delete' });
        await expect(deleteMenuItem).toBeVisible({ timeout: 15000 });
        await deleteMenuItem.click();

        const confirmDeleteButton = this.page.getByRole('button', { name: 'Delete' });
        await expect(confirmDeleteButton).toBeVisible({ timeout: 30000 });
        await confirmDeleteButton.click();

        await this.page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
        await this.page.waitForLoadState('domcontentloaded');
    }
}

