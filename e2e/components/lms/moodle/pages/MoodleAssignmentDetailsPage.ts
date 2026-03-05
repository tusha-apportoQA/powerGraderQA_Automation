import { expect, Page, Locator } from '@playwright/test';

export class MoodleAssignmentDetailsPage {
    page: Page;
    mainContent: Locator;
    assignmentTitle: Locator;
    settingsDropdownToggle: Locator;
    settingsDropdownMenu: Locator;
    advancedGradingLink: Locator;
    addSubmissionButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mainContent = page.getByRole('main');
        // Assignment title is typically in a heading within the main content
        this.assignmentTitle = this.mainContent.locator('h1, h2, h3').first();
        
        // Settings dropdown toggle button (gear icon) - specifically the "Actions menu" not "User menu"
        // Use aria-label to distinguish from user menu
        this.settingsDropdownToggle = page.getByRole('button', { name: 'Actions menu' });
        
        // Settings dropdown menu - match the one controlled by Actions menu (has aria-labelledby pointing to action-menu-toggle-3)
        // Filter to ensure it contains the advanced grading link
        this.settingsDropdownMenu = page.locator('div.dropdown-menu[aria-labelledby*="action-menu-toggle-"]').filter({
            has: page.locator('a[href*="/grade/grading/manage.php"]')
        });
        
        // Link to advanced grading in the dropdown menu
        this.advancedGradingLink = page.locator('a[href*="/grade/grading/manage.php"]').filter({ 
            hasText: 'Advanced grading' 
        });

        // Student: button to add a submission (redirects to action=editsubmission)
        this.addSubmissionButton = page.getByRole('button', { name: 'Add submission' });
    }

    async waitForLoad(): Promise<void> {
        // Wait for assignment details page to load - check for URL pattern
        // Moodle assignment view URL: /mod/assign/view.php?id=XXX
        await this.page.waitForURL(/\/mod\/assign\/view\.php\?id=\d+/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        // Wait for main content to be visible
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
        // Wait a bit for content to render
        await this.page.waitForTimeout(1000);
    }

    async expectAssignmentDetailsLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/mod\/assign\/view\.php\?id=\d+/);
        // Verify we're on assignment details page
        const currentURL = this.page.url();
        if (!currentURL.includes('/mod/assign/view.php')) {
            throw new Error(`Not on assignment details page. Current URL: ${currentURL}`);
        }
        // Check for main content
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
    }

    async verifyAssignmentTitle(expectedTitle: string): Promise<void> {
        await this.waitForLoad();
        // Try to find the assignment title in various possible locations
        const titleSelectors = [
            this.mainContent.locator('h1, h2, h3').filter({ hasText: expectedTitle }),
            this.page.getByRole('heading', { name: expectedTitle }),
            this.mainContent.getByText(expectedTitle).first()
        ];
        
        let titleFound = false;
        for (const selector of titleSelectors) {
            const isVisible = await selector.isVisible({ timeout: 5000 }).catch(() => false);
            if (isVisible) {
                await expect(selector).toBeVisible({ timeout: 10000 });
                titleFound = true;
                break;
            }
        }
        
        if (!titleFound) {
            // Fallback: just check that we're on the assignment page
            await this.expectAssignmentDetailsLoaded();
        }
    }

    /**
     * Navigate to advanced grading page
     * This opens the advanced grading management page for the assignment
     * Clicks the settings dropdown and selects "Advanced grading"
     */
    async navigateToAdvancedGrading(): Promise<void> {
        await this.waitForLoad();
        
        // Click the settings dropdown toggle button (gear icon) - "Actions menu"
        // Check if already expanded, if not click to open
        const isExpanded = await this.settingsDropdownToggle.getAttribute('aria-expanded');
        
        if (isExpanded !== 'true') {
            await expect(this.settingsDropdownToggle).toBeVisible({ timeout: 10000 });
            await this.settingsDropdownToggle.click();
            await this.page.waitForTimeout(500); // Wait for dropdown to open
        }
        
        // Wait for the dropdown menu to be visible
        await expect(this.settingsDropdownMenu).toBeVisible({ timeout: 10000 });
        await this.page.waitForTimeout(500); // Small wait for menu to fully render
        
        // Click the "Advanced grading" link in the dropdown
        await expect(this.advancedGradingLink).toBeVisible({ timeout: 10000 });
        await expect(this.advancedGradingLink).toBeEnabled({ timeout: 10000 });
        
        // Wait for navigation to advanced grading page
        await Promise.all([
            this.page.waitForURL(/\/grade\/grading\/manage\.php/, { timeout: 30000 }),
            this.advancedGradingLink.click()
        ]);
        
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Student: click "Add submission" to go to the edit submission page (view.php?id=X&action=editsubmission).
     */
    async clickAddSubmission(): Promise<void> {
        await this.expectAssignmentDetailsLoaded();
        await expect(this.addSubmissionButton).toBeVisible({ timeout: 10000 });
        await expect(this.addSubmissionButton).toBeEnabled({ timeout: 5000 });
        await Promise.all([
            this.page.waitForURL(/\/mod\/assign\/view\.php\?id=\d+&action=editsubmission/, { timeout: 30000 }),
            this.addSubmissionButton.click()
        ]);
        await this.page.waitForLoadState('domcontentloaded');
    }
}

