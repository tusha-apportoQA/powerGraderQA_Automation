import { expect, Page, Locator } from '@playwright/test';
import { MoodleRubricConfig, MoodleNewRubricConfig } from '../../../../types';

export class MoodleAdvancedGradingPage {
    page: Page;
    mainContent: Locator;
    defineNewRubricButton: Locator;
    createFromTemplateButton: Locator;
    confirmationDialog: Locator;
    continueButton: Locator;
    defineRubricNameInput: Locator;
    defineRubricDescriptionEditor: Locator;
    rubricCriteriaTable: Locator;
    addCriterionButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mainContent = page.locator('div[role="main"]');
        
        // Action buttons for rubric creation - using more stable selectors
        // "Define new grading form from scratch" link
        this.defineNewRubricButton = page.getByRole('link', { name: 'Define new grading form from scratch' });
        
        // "Create new grading form from a template" link
        this.createFromTemplateButton = page.getByRole('link', { name: 'Create new grading form from a template' });
        
        // Confirmation dialog that appears after selecting a rubric template
        this.confirmationDialog = page.locator('div[role="alertdialog"]#notice');
        this.continueButton = page.locator('div[role="alertdialog"]#notice button.btn-primary', { hasText: 'Continue' });

        // Define new rubric form (edit.php page)
        this.defineRubricNameInput = page.getByRole('textbox', { name: 'Name' });
        this.defineRubricDescriptionEditor = page.locator('#id_description_editoreditable');
        this.rubricCriteriaTable = page.locator('#rubric-criteria');
        this.addCriterionButton = page.locator('#rubric-criteria-addcriterion');
    }

    async waitForLoad(): Promise<void> {
        // Wait for advanced grading page to load - check for URL pattern (manage.php or pick.php)
        await this.page.waitForURL(/\/grade\/grading\/(manage|pick)\.php/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        
        // Wait for main content to be visible
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
        // Wait for the heading to be visible - use first() to handle multiple matches
        const heading = this.page.getByRole('heading', { name: /Advanced grading/i }).first();
        await expect(heading).toBeVisible({ timeout: 10000 });
        await this.page.waitForTimeout(1000);
    }

    async expectAdvancedGradingPageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/grade\/grading\/(manage|pick)\.php/);
        const currentURL = this.page.url();
        if (!currentURL.includes('/grade/grading/manage.php') && !currentURL.includes('/grade/grading/pick.php')) {
            throw new Error(`Not on advanced grading page. Current URL: ${currentURL}`);
        }
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
    }

    /**
     * Set up rubric from config: choose new vs existing and select template when existing.
     * Call after advanced grading page is loaded (e.g. after save assignment with rubric method).
     */
    async setupRubric(rubric: MoodleRubricConfig): Promise<void> {
        if (rubric.type === 'no') return;

        await this.waitForLoad();
        await this.expectAdvancedGradingPageLoaded();

        if (rubric.type === 'new') {
            await this.clickDefineNewRubric();
            await this.waitForDefineRubricPage();
            await this.expectDefineRubricPageLoaded();
            await this.createNewRubric(rubric);
        } else if (rubric.type === 'existing') {
            await this.clickCreateFromTemplate();
            await this.waitForTemplateSelectionPage();
            await this.expectTemplateSelectionPageLoaded();
            if (!rubric.rubricName) {
                throw new Error('rubricName is required when using existing rubric type');
            }
            await this.searchOwnRubricTemplate(rubric.rubricName);
            await this.selectRubricTemplate(rubric.rubricName);
        }
    }

    /**
     * Wait for template selection page to load (pick.php)
     * This is the same page structure, just different URL parameter
     */
    async waitForTemplateSelectionPage(): Promise<void> {
        await this.page.waitForURL(/\/grade\/grading\/pick\.php/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
        await this.page.waitForTimeout(1000);
    }

    /**
     * Verify template selection page is loaded
     */
    async expectTemplateSelectionPageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/grade\/grading\/pick\.php/);
        const currentURL = this.page.url();
        if (!currentURL.includes('/grade/grading/pick.php')) {
            throw new Error(`Not on template selection page. Current URL: ${currentURL}`);
        }
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
    }

    /**
     * On pick.php: enable "include my own forms", search by rubric name, and wait for reload.
     */
    async searchOwnRubricTemplate(rubricName: string): Promise<void> {
        await this.expectTemplateSelectionPageLoaded();

        const includeOwnFormsCheckbox = this.page.getByLabel('include my own forms');
        await expect(includeOwnFormsCheckbox).toBeVisible({ timeout: 10000 });
        if (!(await includeOwnFormsCheckbox.isChecked())) {
            await includeOwnFormsCheckbox.check();
        }

        const searchInput = this.page.getByRole('textbox').first();
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        await searchInput.fill(rubricName);

        const searchButton = this.page.locator('#id_submitbutton[value="Search"]');
        await expect(searchButton).toBeVisible({ timeout: 10000 });

        await Promise.all([
            this.page.waitForURL(/\/grade\/grading\/pick\.php/, { timeout: 30000 }),
            searchButton.click(),
        ]);
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
    }

    /**
     * Select an existing rubric template by name.
     * Finds the first heading matching the rubric name (e.g. "Grading rubric Shared template"), then the first "Use this template" below it.
     */
    async selectRubricTemplate(rubricName: string): Promise<void> {
        await this.waitForTemplateSelectionPage();

        const heading = this.page.getByRole('heading', { name: rubricName }).first();
        await expect(heading, `Rubric template "${rubricName}" not found`).toBeVisible({ timeout: 10000 });

        
        const useLink = this.page.locator('a').filter({ hasText: 'Use this form as a template' }).first()
        const useTemplate = this.page.getByRole('link', { name: 'Use this form as a template' }).first()
        const linkVisible = await useLink.isVisible({ timeout: 1000 }).catch(() => false);
        if (linkVisible) {
            await useLink.click();
        } else {
            await useTemplate.click();
        }

        await this.handleConfirmationDialog();
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Handle the confirmation dialog that appears after selecting a rubric template
     * Clicks the "Continue" button to confirm the template selection
     */
    async handleConfirmationDialog(): Promise<void> {
        // Wait for the confirmation dialog to appear
        await expect(this.confirmationDialog).toBeVisible({ timeout: 10000 });
        
        // Wait for the Continue button to be visible and enabled
        await expect(this.continueButton).toBeVisible({ timeout: 10000 });
        await expect(this.continueButton).toBeEnabled({ timeout: 10000 });
        
        console.log('Clicking "Continue" button in confirmation dialog');
        
        // Click Continue and wait for navigation (usually back to manage.php or to edit page)
        await Promise.all([
            this.page.waitForURL(/\/grade\/grading\/(manage|form\/rubric\/edit)\.php/, { timeout: 30000 }),
            this.continueButton.click()
        ]);
        
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Click "Define new grading form from scratch" link (redirects to edit.php?areaid=...).
     */
    async clickDefineNewRubric(): Promise<void> {
        await this.waitForLoad();

        await expect(this.defineNewRubricButton).toBeVisible({ timeout: 10000 });
        await expect(this.defineNewRubricButton).toBeEnabled({ timeout: 10000 });

        await Promise.all([
            this.page.waitForURL(/\/grade\/grading\/form\/rubric\/edit\.php/, { timeout: 30000 }),
            this.defineNewRubricButton.click()
        ]);

        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Wait for the define rubric page to load (edit.php?areaid=...).
     */
    async waitForDefineRubricPage(): Promise<void> {
        await this.page.waitForURL(/\/grade\/grading\/form\/rubric\/edit\.php/, { timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify the define rubric page is loaded (edit.php URL + network idle).
     */
    async expectDefineRubricPageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/grade\/grading\/form\/rubric\/edit\.php/);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Create (define) the new rubric on the define rubric form: name, description, criteria, levels.
     * Call after expectDefineRubricPageLoaded(). Implements the full new rubric flow.
     */
    async createNewRubric(config: MoodleNewRubricConfig): Promise<void> {
        await this.expectDefineRubricPageLoaded();
        await expect(this.defineRubricNameInput).toBeVisible({ timeout: 10000 });
        await this.defineRubricNameInput.fill(config.title);
        if (config.description != null && config.description !== '') {
            await expect(this.defineRubricDescriptionEditor).toBeVisible({ timeout: 10000 });
            await this.defineRubricDescriptionEditor.click();
            await this.defineRubricDescriptionEditor.fill(config.description);
        }

        await expect(this.rubricCriteriaTable).toBeVisible({ timeout: 10000 });
        const criterionRows = this.rubricCriteriaTable.locator('tbody tr.criterion');
        const initialRowCount = await criterionRows.count();

        // Add criterion rows so we have one row per config criterion (page starts with 1 row).
        for (let a = 0; a < config.criteria.length - initialRowCount; a++) {
            await expect(this.addCriterionButton).toBeVisible({ timeout: 5000 });
            await this.addCriterionButton.click();
            await this.page.waitForTimeout(300);
        }

        for (let i = 0; i < config.criteria.length; i++) {
            const row = criterionRows.nth(i);
            const criterion = config.criteria[i];

            // Fill criterion description: click "Click to edit criterion" then fill textbox (scoped to row).
            const descriptionCell = row.locator('td.description');
            await descriptionCell.getByText('Click to edit criterion').click();
            await this.page.waitForTimeout(200);
            const criterionTextbox = row.getByRole('textbox', { name: /Criterion/i });
            await expect(criterionTextbox).toBeVisible({ timeout: 5000 });
            await criterionTextbox.fill(criterion.description);

            // Ensure enough levels: add levels until we have at least as many as config (default may be 3, 4, or 5).
            const levelCells = row.locator('td.levels td.level');
            let levelCount = await levelCells.count();
            const addLevelBtn = row.getByRole('button', { name: 'Add level' });
            while (levelCount < criterion.ratings.length) {
                await addLevelBtn.click();
                await this.page.waitForTimeout(300);
                levelCount = await levelCells.count();
            }

            // Fill each level: definition (Level 1 definition, Level 2 definition, ...) and score (1-based index).
            for (let j = 0; j < criterion.ratings.length; j++) {
                const levelCell = levelCells.nth(j);
                const rating = criterion.ratings[j];
                const levelIndex = j + 1; // 1-based for aria-label

                const definitionPlain = levelCell.locator('.definition .plainvalue');
                await definitionPlain.getByText('Click to edit level').click();
                await this.page.waitForTimeout(200);
                const definitionTextbox = levelCell.getByRole('textbox', { name: `Level ${levelIndex} definition` });
                await expect(definitionTextbox).toBeVisible({ timeout: 5000 });
                await definitionTextbox.fill(rating.description);

                const scoreInput = levelCell.getByRole('textbox', { name: `Score input for level ${levelIndex}` });
                await expect(scoreInput).toBeVisible({ timeout: 5000 });
                await scoreInput.fill(String(rating.points));
            }

            // Remove excess levels: delete from the end until we have exactly criterion.ratings.length levels.
            levelCount = await levelCells.count();
            while (levelCount > criterion.ratings.length) {
                const lastLevelCell = row.locator('td.levels td.level').last();
                const deleteLevelBtn = lastLevelCell.locator('div.delete input[type="submit"]');
                await deleteLevelBtn.click();
                await this.page.waitForTimeout(200);
                const confirmDialog = this.page.locator('div.confirmation-dialogue');
                await expect(confirmDialog).toBeVisible({ timeout: 5000 });
                await confirmDialog.getByRole('button', { name: 'Yes' }).click();
                await this.page.waitForTimeout(300);
                levelCount = await levelCells.count();
            }
        }

        // Save the created rubric
        const saveRubricButton = this.page.locator('input[name="saverubric"]');
        await expect(saveRubricButton).toBeVisible({ timeout: 5000 });
        await saveRubricButton.click();
    }

    /**
     * Click "Create new grading form from a template" link
     */
    
    async clickCreateFromTemplate(): Promise<void> {
        await this.waitForLoad();

        await expect(this.createFromTemplateButton).toBeVisible({ timeout: 10000 });
        await expect(this.createFromTemplateButton).toBeEnabled({ timeout: 10000 });

        await Promise.all([
            this.page.waitForURL(/\/grade\/grading\/pick\.php/, { timeout: 30000 }),
            this.createFromTemplateButton.click()
        ]);

        await this.page.waitForLoadState('domcontentloaded');
    }
}

