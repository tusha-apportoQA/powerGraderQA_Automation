import { expect, Page, Locator } from '@playwright/test';

export class MoodleCoursePage {
    page: Page;
    courseContent: Locator;
    navigationBar: Locator;
    editModeCheckbox: Locator;

    constructor(page: Page) {
        this.page = page;
        this.courseContent = page.locator('body');
        this.navigationBar = page.locator('.navbar, nav, [role="navigation"]').first();
        this.editModeCheckbox = page.getByRole('checkbox', { name: 'Edit mode' });
    }

    async waitForLoad(): Promise<void> {
        // Wait for course page to load - check for URL pattern
        await this.page.waitForURL(/\/course\/view\.php\?id=\d+/, { timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
        // Wait a bit for content to render
        await this.page.waitForTimeout(5000);
    }

    async expectCoursePageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/course\/view\.php\?id=\d+/);
        // Verify we're on a course page
        const currentURL = this.page.url();
        if (!currentURL.includes('/course/view.php')) {
            throw new Error(`Not on course page. Current URL: ${currentURL}`);
        }
        // Check for course content
        await expect(this.courseContent).toBeVisible({ timeout: 10000 });
    }

    async turnEditingOn(): Promise<void> {
        await this.waitForLoad();

        await expect(this.editModeCheckbox).toBeVisible({ timeout: 10000 });
        if (await this.editModeCheckbox.isChecked()) {
            console.log('Editing is already turned on');
            return;
        }

        await this.editModeCheckbox.check();
        await expect(this.editModeCheckbox).toBeChecked({ timeout: 10000 });
        await this.waitForLoad();
    }

    async turnEditingOff(): Promise<void> {
        await this.waitForLoad();

        await expect(this.editModeCheckbox).toBeVisible({ timeout: 10000 });
        if (!(await this.editModeCheckbox.isChecked())) {
            console.log('Editing is already turned off');
            return;
        }

        await this.editModeCheckbox.uncheck();
        await expect(this.editModeCheckbox).not.toBeChecked({ timeout: 10000 });
        await this.waitForLoad();
    }

    async clickAddActivityOrResource(): Promise<void> {
        await this.waitForLoad();
        // Click "Add an activity or resource" button in General section
        const addButton = this.page.locator('button').filter({ hasText: 'Add an activity or resource' }).first();
        await expect(addButton).toBeVisible({ timeout: 10000 });
        await addButton.click();
        
        // Wait for the activity/resource selection dialog/modal to appear
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(5000); // Wait 5 seconds after clicking
    }

    async waitForActivityChooserModal(): Promise<void> {
        // Wait for the modal to be visible
        const modal = this.page.getByRole('dialog')
        await expect(modal).toBeVisible({ timeout: 10000 });
        
        const modalTitle = modal.getByRole('heading', { name: 'Add an activity or resource' });
        await expect(modalTitle).toBeVisible({ timeout: 10000 });
        
        // Wait a bit for modal content to fully load
        await this.page.waitForTimeout(1000);
    }

    async selectAssignmentLinkFromModal(): Promise<void> {
        // Wait for modal to be visible first
        await this.waitForActivityChooserModal();
        
        // Find the Assignment option link by title "Add a new Assignment"
        const assignmentLink = this.page.getByTitle('Add a new Assignment').first();
        await expect(assignmentLink).toBeVisible({ timeout: 10000 });
        await assignmentLink.click();
        
        // Wait for navigation to assignment creation page
        await this.page.waitForURL(/\/course\/modedit\.php.*add=assign/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Check if an assignment link with the given title is visible on the course page (for polling).
     */
    async hasAssignmentLink(assignmentTitle: string): Promise<boolean> {
        await this.expectCoursePageLoaded();
        const link = this.page.getByRole('link', { name: assignmentTitle }).first();
        return link.isVisible({ timeout: 5000 }).catch(() => false);
    }

    /**
     * Click on an assignment link by title to navigate to assignment details
     * @param assignmentTitle - The title of the assignment to click
     */
    async clickAssignment(assignmentTitle: string): Promise<void> {
        await this.waitForLoad();

        // Find assignment link by title - Moodle assignments are typically in activity cards
        const assignmentLink = this.page.getByRole('link', { name: assignmentTitle }).first();

        await expect(assignmentLink, `Assignment "${assignmentTitle}" not found on course page`).toBeVisible({ timeout: 30000 });
        await assignmentLink.click();

        // Wait for navigation to assignment details page
        await this.page.waitForURL(/\/mod\/assign\/view\.php\?id=\d+/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Deletes each assignment from the course page (editing mode on, Edit → Delete → Yes per item).
     * Targets `.activity-item[data-activityname="..."]` directly. After **Yes**, wait until that
     * activity item is **detached** or **hidden** before the next iteration.
     */
    async deleteAssignmentsByNames(assignmentTitles: string[]): Promise<void> {
        if (assignmentTitles.length === 0) {
            return;
        }

        await this.waitForLoad();
        await this.turnEditingOn();

        for (const assignmentTitle of assignmentTitles) {
            await this.page.waitForLoadState('networkidle');
            await this.waitForLoad();

            const assignmentContainer = this.page.locator(`.activity-item[data-activityname="${assignmentTitle}"]`);
            await expect(
                assignmentContainer,
                `Assignment "${assignmentTitle}" not found on Moodle course list page`,
            ).toBeVisible({ timeout: 30000 });

            const editButton = assignmentContainer.getByRole('button').filter({
                has: this.page.getByTitle('Edit'),
            });
            await expect(editButton, `Edit button not found for assignment "${assignmentTitle}"`).toBeVisible({
                timeout: 30000,
            });
            await editButton.click();

            const deleteMenuItem = assignmentContainer.getByRole('menuitem', { name: 'Delete' });
            await expect(
                deleteMenuItem,
                `Delete menuitem not found for assignment "${assignmentTitle}"`,
            ).toBeVisible({ timeout: 30000 });
            await deleteMenuItem.click();

            const confirmYesButton = this.page.locator('button').filter({ hasText: 'Yes' }).last();
            await expect(confirmYesButton, 'Delete confirmation "Yes" button not visible').toBeVisible({
                timeout: 30000,
            });
            await confirmYesButton.click();

            try {
                await assignmentContainer.waitFor({ state: 'detached', timeout: 0 });
            } catch {
                await assignmentContainer.waitFor({ state: 'hidden', timeout: 0 });
            }

            console.log(`[MoodleCoursePage] Assignment "${assignmentTitle}" delete confirmed.`);
        }
    }
}

