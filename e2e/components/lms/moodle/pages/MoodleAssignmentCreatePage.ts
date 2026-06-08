import { expect, Page, Locator } from '@playwright/test';
import { FormatType } from '../../../../types';

export class MoodleAssignmentCreatePage {
    page: Page;
    mainContent: Locator;
    form: Locator;
    assignmentNameInput: Locator;
    descriptionEditor: Locator;
    submissionTypesFieldset: Locator;
    onlineTextCheckbox: Locator;
    fileSubmissionsCheckbox: Locator;
    gradeFieldset: Locator;
    gradeTypeSelect: Locator;
    maximumGradeInput: Locator;
    gradingMethodSelect: Locator;
    saveAndDisplayButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mainContent = page.getByRole('main');
        this.form = this.mainContent.locator('form').first();
        this.assignmentNameInput = page.getByRole('textbox', { name: 'Assignment name' });
        this.descriptionEditor = page.locator('#id_introeditoreditable');
        
        // Submission types fieldset
        this.submissionTypesFieldset = page.locator('fieldset#id_submissiontypes');
        this.onlineTextCheckbox = page.locator('#id_assignsubmission_onlinetext_enabled');
        this.fileSubmissionsCheckbox = page.locator('#id_assignsubmission_file_enabled');
        
        // Grade fieldset
        this.gradeFieldset = page.locator('fieldset#id_modstandardgrade');
        this.gradeTypeSelect = page.locator('#id_grade_modgrade_type');
        this.maximumGradeInput = page.locator('#id_grade_modgrade_point');
        this.gradingMethodSelect = page.locator('#id_advancedgradingmethod_submissions');
        
        // Save button
        this.saveAndDisplayButton = page.locator('#id_submitbutton');
    }

    async waitForLoad(): Promise<void> {
        // Wait for assignment creation page to load - check for URL pattern
        await this.page.waitForURL(/\/course\/modedit\.php.*add=assign/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        // Wait for main content to be visible
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
        // Wait a bit for content to render
        await this.page.waitForTimeout(1000);
        await this.expandAll();
    }

    /**
     * Ensure all sections are expanded using "Expand all". If "Expand all" is visible, not all are expanded; click it.
     * If "Collapse all" is visible, all are already expanded.
     */
    async expandAll(): Promise<void> {
        const expandAllBtn = this.page.getByText('Expand all', { exact: true });
        if (await expandAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expandAllBtn.click();
            await this.page.waitForTimeout(500);
        }
    }

    async expectAssignmentCreatePageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/course\/modedit\.php.*add=assign/);
        // Verify we're on assignment creation page
        const currentURL = this.page.url();
        if (!currentURL.includes('/course/modedit.php') || !currentURL.includes('add=assign')) {
            throw new Error(`Not on assignment creation page. Current URL: ${currentURL}`);
        }
        // Check for main content and form
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
        await expect(this.form).toBeVisible({ timeout: 10000 });
    }

    async fillTitle(title: string): Promise<void> {
        await this.waitForLoad();
        await expect(this.assignmentNameInput).toBeVisible({ timeout: 10000 });
        await this.assignmentNameInput.fill(title);
    }

    async fillDescription(description: string): Promise<void> {
        await this.waitForLoad();
        
        // Check if description editor is in an iframe
        const iframe = this.page.locator('iframe[id*="introeditor"]').first();
        const iframeExists = await iframe.count() > 0;
        
        if (iframeExists && await iframe.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Handle iframe-based editor (like TinyMCE)
            const frameLocator = this.page.frameLocator('iframe[id*="introeditor"]').first();
            const iframeBody = frameLocator.locator('body');
            await expect(iframeBody).toBeVisible({ timeout: 10000 });
            await iframeBody.click();
            await this.page.waitForTimeout(300);
            await iframeBody.fill(description);
        } else {
            // Handle direct editable div (contenteditable)
            await expect(this.descriptionEditor).toBeVisible({ timeout: 10000 });
            
            // Click to activate the editor
            await this.descriptionEditor.click();
            await this.page.waitForTimeout(500);
            
            // Clear any existing content first
            await this.page.keyboard.press('Control+A');
            await this.page.waitForTimeout(200);
            
            // Type the description
            await this.page.keyboard.type(description, { delay: 50 });
        }
        
        await this.page.waitForTimeout(500);
    }

    /**
     * Parse date string in format "MM/DD/YYYY HH:mm" and return components
     */
    private parseDate(dateString: string): { day: number; month: number; year: number; hour: number; minute: number } {
        // Format: "MM/DD/YYYY HH:mm"
        const [datePart, timePart] = dateString.split(' ');
        const [month, day, year] = datePart.split('/').map(Number);
        const [hour, minute] = timePart ? timePart.split(':').map(Number) : [0, 0];
        
        return { day, month, year, hour, minute };
    }

    /**
     * Set date and time for a date field
     */
    private async setDateTime(
        fieldId: string,
        dateString: string,
        enable: boolean = true
    ): Promise<void> {
        const { day, month, year, hour, minute } = this.parseDate(dateString);
        
        // Enable checkbox if needed
        const enableCheckbox = this.page.locator(`#id_${fieldId}_enabled`);
        const isEnabled = await enableCheckbox.isChecked();
        
        if (enable && !isEnabled) {
            await enableCheckbox.check();
            await this.page.waitForTimeout(500);
        } else if (!enable && isEnabled) {
            await enableCheckbox.uncheck();
            await this.page.waitForTimeout(500);
            return; // Don't set date if disabled
        }
        
        // Set day
        const daySelect = this.page.locator(`#id_${fieldId}_day`);
        await expect(daySelect).toBeEnabled({ timeout: 5000 });
        await daySelect.selectOption(String(day));
        
        // Set month (1-12, but select uses 1-12)
        const monthSelect = this.page.locator(`#id_${fieldId}_month`);
        await expect(monthSelect).toBeEnabled({ timeout: 5000 });
        await monthSelect.selectOption(String(month));
        
        // Set year
        const yearSelect = this.page.locator(`#id_${fieldId}_year`);
        await expect(yearSelect).toBeEnabled({ timeout: 5000 });
        await yearSelect.selectOption(String(year));
        
        // Set hour
        const hourSelect = this.page.locator(`#id_${fieldId}_hour`);
        await expect(hourSelect).toBeEnabled({ timeout: 5000 });
        await hourSelect.selectOption(String(hour));
        
        // Set minute
        const minuteSelect = this.page.locator(`#id_${fieldId}_minute`);
        await expect(minuteSelect).toBeEnabled({ timeout: 5000 });
        await minuteSelect.selectOption(String(minute));
        
        await this.page.waitForTimeout(500);
    }

    /**
     * Set "Allow submissions from" date
     */
    async setAllowSubmissionsFromDate(dateString: string, enable: boolean = true): Promise<void> {
        await this.waitForLoad();
        await this.setDateTime('allowsubmissionsfromdate', dateString, enable);
    }

    /**
     * Set "Due date"
     */
    async setDueDate(dateString: string, enable: boolean = true): Promise<void> {
        await this.waitForLoad();
        await this.setDateTime('duedate', dateString, enable);
    }

    /**
     * Set "Cut-off date" (until date)
     */
    async setCutOffDate(dateString: string, enable: boolean = true): Promise<void> {
        await this.waitForLoad();
        await this.setDateTime('cutoffdate', dateString, enable);
    }

    /**
     * Set submission type for the assignment
     * @param submissionType - Type of submission (.pdf, .docx, .txt, .csv, .xlsx, or 'Text Entry')
     */
    async setSubmissionType(submissionType: FormatType): Promise<void> {
        await this.waitForLoad();
        
        if (submissionType === 'Text Entry') {
            // Enable online text submission
            await expect(this.onlineTextCheckbox).toBeVisible({ timeout: 10000 });
            if (!(await this.onlineTextCheckbox.isChecked())) {
                await this.onlineTextCheckbox.check();
                await this.page.waitForTimeout(500);
            }
            
            // Disable file submissions if enabled
            if (await this.fileSubmissionsCheckbox.isChecked()) {
                await this.fileSubmissionsCheckbox.uncheck();
                await this.page.waitForTimeout(500);
            }
        } else {
            // Enable file submissions (for .pdf, .docx, .txt, .csv, .xlsx)
            await expect(this.fileSubmissionsCheckbox).toBeVisible({ timeout: 10000 });
            if (!(await this.fileSubmissionsCheckbox.isChecked())) {
                await this.fileSubmissionsCheckbox.check();
                await this.page.waitForTimeout(500);
            }
            
            // Disable online text if enabled
            if (await this.onlineTextCheckbox.isChecked()) {
                await this.onlineTextCheckbox.uncheck();
                await this.page.waitForTimeout(500);
            }
        }
    }

    /**
     * Set points/grade for the assignment
     * @param points - Maximum points/grade value
     */
    async setPoints(points: number): Promise<void> {
        await this.waitForLoad();
        
        // Ensure grade type is set to "Point"
        await expect(this.gradeTypeSelect).toBeVisible({ timeout: 10000 });
        const currentType = await this.gradeTypeSelect.inputValue();
        if (currentType !== 'point') {
            await this.gradeTypeSelect.selectOption('point');
            await this.page.waitForTimeout(500);
        }
        
        // Set maximum grade/points
        await expect(this.maximumGradeInput).toBeVisible({ timeout: 10000 });
        await this.maximumGradeInput.clear();
        await this.maximumGradeInput.fill(points.toString());
        await this.page.waitForTimeout(500);
    }

    /**
     * Set grading method to Rubric
     */
    async setGradingMethodToRubric(): Promise<void> {
        await this.waitForLoad();
        
        await expect(this.gradingMethodSelect).toBeVisible({ timeout: 10000 });
        await this.gradingMethodSelect.selectOption('rubric');
        await this.page.waitForTimeout(500);
    }

    /**
     * Click "Save and display" button to save the assignment.
     * Moodle may redirect to assignment view (/mod/assign/view.php?id=XXX) or, when rubric is used, to advanced grading (/grade/grading/manage.php).
     */
    async clickSaveAndDisplay(): Promise<void> {
        await this.waitForLoad();

        await expect(this.saveAndDisplayButton).toBeVisible({ timeout: 10000 });
        await expect(this.saveAndDisplayButton).toBeEnabled({ timeout: 10000 });

        await Promise.all([
            this.page.waitForURL(url => {
                const u = url.toString();
                return /\/mod\/assign\/view\.php\?id=\d+/.test(u) || /\/grade\/grading\/manage\.php/.test(u);
            }, { timeout: 30000 }),
            this.saveAndDisplayButton.click()
        ]);

        await this.page.waitForLoadState('domcontentloaded');
    }
}

