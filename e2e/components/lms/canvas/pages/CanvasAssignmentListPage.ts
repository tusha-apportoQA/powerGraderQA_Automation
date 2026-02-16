import { expect, Page, Locator } from '@playwright/test';

export class CanvasAssignmentListPage {
    page: Page;
    createAssignmentButton: Locator;

   /* constructor(page: Page) {
        this.page = page;
        this.createAssignmentButton = page.getByRole('link', { name: 'Add assignment' });
    }*/
    
    //Update by Tusha
    constructor(page: Page) {
        this.page = page;
        // Targeting the specific CSS class from your screenshot for maximum reliability
        this.createAssignmentButton = page.locator('a.new_assignment').first();
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForURL(/\/courses\/\d+\/assignments/, { timeout: 30000 });
        await this.page.waitForLoadState();
        await this.page.waitForTimeout(1000);
    }

    async expectAssignmentsListLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/courses\/\d+\/assignments/);
        try {
            await expect(this.createAssignmentButton).toBeVisible({ timeout: 2000 });
        } catch {
            // Button not visible (student role) - that's expected
        }
    }

    /*async clickCreateAssignment(): Promise<void> {
        await expect(this.createAssignmentButton).toBeVisible({ timeout: 50000 });
        await this.createAssignmentButton.click();

        await this.page.waitForURL(/\/courses\/\d+\/assignments\/new/, { timeout: 50000 });
        await this.page.waitForLoadState();
    }*/
    
    //Update by Tusha
    async clickCreateAssignment(): Promise<void> {
        // 1. Wait for the button to be attached to the DOM and visible
        await this.createAssignmentButton.waitFor({ state: 'visible', timeout: 30000 });
        
        // 2. Aggressive click - sometimes Canvas overlays invisible elements during load
        await this.createAssignmentButton.click({ force: true });

        // 3. Confirm we actually navigated to the "New" page
        await this.page.waitForURL(/\/assignments\/new/, { timeout: 30000 });
    }

    async clickAssignment(assignmentName: string): Promise<void> {
        await this.waitForLoad();

        const assignmentLink = this.page.getByRole('link', { name: assignmentName });
        await expect(assignmentLink).toBeVisible({ timeout: 30000 });
        await assignmentLink.click();

        await this.page.waitForURL(/\/courses\/\d+\/assignments\/\d+/, { timeout: 30000 });
        await this.page.waitForLoadState();
    }

    /**
     * Click assignment by ID (useful when multiple assignments have the same name)
     * @param assignmentId - The assignment ID to click
     */
    async clickAssignmentById(assignmentId: string): Promise<void> {
        await this.waitForLoad();

        const assignmentLink = this.page.locator(`a[href*="/assignments/${assignmentId}"]`).first();
        await expect(assignmentLink).toBeVisible({ timeout: 30000 });
        
        const href = await assignmentLink.getAttribute('href');
        if (href && !href.includes(`/assignments/${assignmentId}`)) {
            throw new Error(`Assignment link href "${href}" does not contain expected ID "${assignmentId}"`);
        }
        
        await assignmentLink.click();

        await this.page.waitForURL(new RegExp(`/courses/\\d+/assignments/${assignmentId}`), { timeout: 30000 });
        await this.page.waitForLoadState();
    }

    /**
     * Click assignment by name and validate the assignment ID in the link
     * @param assignmentName - The name of the assignment to click
     * @param expectedId - The expected assignment ID to validate
     */
    async clickAssignmentAndValidateId(assignmentName: string, expectedId: string): Promise<void> {
        await this.waitForLoad();

        const assignmentLink = this.page.getByRole('link', { name: assignmentName });
        await expect(assignmentLink).toBeVisible({ timeout: 30000 });

        const href = await assignmentLink.getAttribute('href');
        if (href && !href.includes(`/assignments/${expectedId}`)) {
            throw new Error(`Assignment "${assignmentName}" link href "${href}" does not contain expected ID "${expectedId}"`);
        }

        await assignmentLink.click();

        await this.page.waitForURL(new RegExp(`/courses/\\d+/assignments/${expectedId}`), { timeout: 30000 });
        await this.page.waitForLoadState();
    }
}

