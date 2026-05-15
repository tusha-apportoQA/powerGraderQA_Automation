import { expect, Page, Locator } from '@playwright/test';
import type { AssignmentConfig, FormatType, D2LRubricConfig } from '../../../../types';
import { D2LRubricDialog } from '../dialogs/D2LRubricDialog';

export class D2LAssignmentCreatePage {
    page: Page;
    immersiveHeader: Locator;
    newAssignmentHeading: Locator;
    titleInput: Locator;
    dueDateInput: Locator;
    startDateInput: Locator;
    endDateInput: Locator;
    gradeButton: Locator;
    pointsInput: Locator;
    submissionTypeSelect: Locator;
    saveButton: Locator;
    cancelButton: Locator;
    evalFeedbackSection: Locator;
    evalFeedbackBtn: Locator;
    addRubricBtn: Locator;
    createNewRubricMenuItem: Locator;
    addExistingRubricMenuItem: Locator;
    rubricDialog: D2LRubricDialog;

    constructor(page: Page) {
        this.page = page;
        this.immersiveHeader = page.locator('.d2l-labs-navigation-immersive-container');
        this.newAssignmentHeading = page.getByRole('heading', { name: 'New Assignment', exact: true });

        this.titleInput = page.getByRole('textbox', { name: 'Assignment Title', exact: true });
        
        const dueDateFieldset = page.locator('d2l-input-fieldset[label="Due Date"]');
        this.dueDateInput = dueDateFieldset.locator('input').first();
        
        const startDateTime = page.locator('d2l-input-date-time#start-date-input');
        const startDateFieldset = startDateTime.locator('d2l-input-fieldset[label="Start Date"]');
        this.startDateInput = startDateFieldset.locator('input').first();
        
        const endDateTime = page.locator('d2l-input-date-time#end-date-input');
        const endDateFieldset = endDateTime.locator('d2l-input-fieldset[label="End Date"]');
        this.endDateInput = endDateFieldset.locator('input').first();
        
        this.gradeButton = page.locator('button#ungraded');
        const scoreEditor = page.locator('d2l-activity-score-editor');
        const gradeInputNumber = scoreEditor.locator('d2l-input-number#score-out-of');
        this.pointsInput = gradeInputNumber.getByRole('textbox', { name: 'Grade Out Of', exact: true });
        
        this.submissionTypeSelect = page.locator('select#assignment-submission-type');
        this.saveButton = page.getByRole('button', { name: 'Save and Close', exact: true });
        this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
        
        this.evalFeedbackSection = page.locator('d2l-activity-accordion-collapse[panel-title="Evaluation & Feedback"]');
        this.evalFeedbackBtn = this.evalFeedbackSection.getByRole("button", { name: "Evaluation & Feedback" });
        this.addRubricBtn = this.evalFeedbackSection.getByRole('button', { name: 'Add Rubric' });
        this.createNewRubricMenuItem = this.evalFeedbackSection.locator('d2l-menu-item[text="Create New"]');
        this.addExistingRubricMenuItem = this.evalFeedbackSection.locator('d2l-menu-item[text="Add Existing"]');
        
        this.rubricDialog = new D2LRubricDialog(page);
    }

    async waitForLoad(): Promise<void> {
        await expect(this.newAssignmentHeading).toBeVisible({ timeout: 60000 });
        await expect(this.immersiveHeader).toBeVisible({ timeout: 30000 });
    }

    async expectCreatePageLoaded(): Promise<void> {
        await this.waitForLoad();
    }

    async fillTitle(title: string): Promise<void> {
        await this.waitForLoad();
        await expect(this.titleInput).toBeVisible({ timeout: 30000 });
        await this.titleInput.fill(title);
    }

    async fillInstructions(instructions: string): Promise<void> {
        await this.waitForLoad();

        const editorFrame = this.page.frameLocator('iframe[title="Instructions"], iframe[aria-label="Instructions"]');
        const body = editorFrame.locator('body');

        await expect(body).toBeVisible({ timeout: 30000 });
        await body.click();
        await body.fill(instructions);
    }

    async setDueDate(dateMMDDYYYY: string): Promise<void> {
        await this.waitForLoad();
        await expect(this.dueDateInput).toBeVisible({ timeout: 30000 });
        await this.dueDateInput.fill(dateMMDDYYYY);
        await this.dueDateInput.press('Tab');
    }

    async setPoints(points: number): Promise<void> {
        await this.waitForLoad();

        await expect(this.gradeButton).toBeVisible({ timeout: 30000 });
        await this.gradeButton.click();

        await expect(this.pointsInput).toBeVisible({ timeout: 30000 });
        await this.pointsInput.fill(String(points));
        await this.pointsInput.press('Tab');
    }

    async setStartDate(dateMMDDYYYY: string): Promise<void> {
        await this.waitForLoad();
        
        const availabilitySection = this.page.locator('d2l-activity-accordion-collapse[panel-title="Availability Dates & Conditions"]');
        const panelButton = availabilitySection.locator('button.d2l-collapsible-panel-opener');
        
        const isExpanded = await panelButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await panelButton.click();
            await this.page.waitForTimeout(500);
        }
        
        await expect(this.startDateInput).toBeVisible({ timeout: 30000 });
        await this.startDateInput.fill(dateMMDDYYYY);
        await this.startDateInput.press('Tab');
    }

    async setEndDate(dateMMDDYYYY: string): Promise<void> {
        await this.waitForLoad();
        
        const availabilitySection = this.page.locator('d2l-activity-accordion-collapse[panel-title="Availability Dates & Conditions"]');
        const panelButton = availabilitySection.locator('button.d2l-collapsible-panel-opener');
        
        const isExpanded = await panelButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await panelButton.click();
            await this.page.waitForTimeout(500);
        }
        
        await expect(this.endDateInput).toBeVisible({ timeout: 30000 });
        await this.endDateInput.fill(dateMMDDYYYY);
        await this.endDateInput.press('Tab');
    }

    async setSubmissionType(submissionType: FormatType): Promise<void> {
        await this.waitForLoad();
        
        const submissionSection = this.page.locator('d2l-activity-accordion-collapse[panel-title="Submission & Completion"]');
        const panelButton = submissionSection.locator('button.d2l-collapsible-panel-opener');
        
        const isExpanded = await panelButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await panelButton.click();
            await this.page.waitForTimeout(500);
        }
        
        await expect(this.submissionTypeSelect).toBeVisible({ timeout: 30000 });
        
        let submissionValue: string;
        switch (submissionType) {
            case 'Text Entry':
                submissionValue = '1';
                break;
            case '.docx':
            case '.pdf':
            case '.txt':
                submissionValue = '0';
                break;
            default:
                submissionValue = '0';
        }
        
        await this.submissionTypeSelect.selectOption(submissionValue);
    }

    async clickSave(): Promise<void> {
        await this.waitForLoad();
        await expect(this.saveButton).toBeVisible({ timeout: 30000 });
        await expect(this.saveButton).toBeEnabled({ timeout: 10000 });
        
        const clickPromise = this.saveButton.click();
        const assignmentListHeading = this.page.getByRole('heading', { name: 'Assignments', exact: true });
        
        await clickPromise;
        
        try {
            await expect(assignmentListHeading).toBeVisible({ timeout: 30000 });
        } catch (error) {
            const newAssignmentHeading = this.page.getByRole('heading', { name: 'New Assignment', exact: true });
            const stillOnCreatePage = await newAssignmentHeading.isVisible().catch(() => false);
            
            if (stillOnCreatePage) {
                const errorMessages = this.page.locator('.d2l-alert, .d2l-message, [role="alert"]');
                const hasError = await errorMessages.count() > 0;
                if (hasError) {
                    const errorText = await errorMessages.first().textContent().catch(() => 'Unknown error');
                    throw new Error(`Save failed with error: ${errorText}`);
                }
                throw new Error('Save button clicked but page did not navigate. Assignment may not have been saved.');
            }
            throw error;
        }
        
        const newAssignmentButton = this.page.getByRole('button', { name: 'New Assignment', exact: true });
        await expect(newAssignmentButton).toBeVisible({ timeout: 10000 });
        
        await this.page.waitForLoadState('domcontentloaded');
    }

    async clickCancel(): Promise<void> {
        await this.waitForLoad();
        await expect(this.cancelButton).toBeVisible({ timeout: 30000 });
        await this.cancelButton.click();
        await this.page.waitForTimeout(500);
        
        const confirmDialog = this.page.locator('d2l-dialog-confirm[title-text="Discard changes?"]').first();
        await confirmDialog.waitFor({ state: 'attached', timeout: 10000 });
        
        const yesButton = confirmDialog
            .locator('d2l-button[dialog-action="confirm"]')
            .first();
        
        await yesButton.waitFor({ state: 'attached', timeout: 10000 });
        await yesButton.click();
        await this.page.waitForTimeout(500);
        
        try {
            await this.page.waitForURL(/\/d2l\/lms\/dropbox\/admin\/folders_manage\.d2l/, { timeout: 30000 });
        } catch (error) {
            await this.page.waitForURL(/\/d2l\/lms\/dropbox/, { timeout: 10000 });
        }
        await this.page.waitForLoadState('domcontentloaded');
    }

    async expandEvalFeedbackSection(): Promise<void> {
        await this.waitForLoad();
        const isExpanded = await this.evalFeedbackSection.getAttribute('expanded');
        if (isExpanded !== '') {
            await this.evalFeedbackBtn.click();
            await this.page.waitForTimeout(500);
        }
    }

    async openCreateRubricDialog(): Promise<void> {
        await this.expandEvalFeedbackSection();
        
        await expect(this.addRubricBtn).toBeVisible({ timeout: 30000 });
        await this.addRubricBtn.click();
        await this.page.waitForTimeout(500);
        
        await expect(this.createNewRubricMenuItem).toBeVisible({ timeout: 10000 });
        await this.createNewRubricMenuItem.click();
        await this.page.waitForTimeout(1000);
        
        await this.rubricDialog.waitForDialogOpen();
    }

    async openAddExistingRubricDialog(): Promise<void> {
        await this.expandEvalFeedbackSection();

        await expect(this.addRubricBtn).toBeVisible({ timeout: 30000 });
        await this.addRubricBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});

        await expect(this.addExistingRubricMenuItem).toBeVisible({ timeout: 10000 });
        await this.addExistingRubricMenuItem.click();
        await this.page.waitForTimeout(500);

        await this.rubricDialog.waitForAddAssociationsDialogOpen();
    }

    async setRubric(rubric: D2LRubricConfig): Promise<void> {
        if (rubric.type === 'no') {
            return;
        }

        if (rubric.type === 'new') {
            await this.openCreateRubricDialog();
            await this.rubricDialog.setTitle(rubric.title);
            await this.rubricDialog.configureLevels(rubric.levels);
            if (rubric.criterion && rubric.criterion.length > 0) {
                await this.rubricDialog.configureCriteria(rubric.criterion);
            }
            await this.rubricDialog.attachRubric();
            return;
        }

        if (rubric.type === 'existing') {
            await this.openAddExistingRubricDialog();
            await this.rubricDialog.selectExistingRubricByName(rubric.rubricName);
            await this.rubricDialog.confirmAddSelectedExistingRubrics();
        }
    }
}
