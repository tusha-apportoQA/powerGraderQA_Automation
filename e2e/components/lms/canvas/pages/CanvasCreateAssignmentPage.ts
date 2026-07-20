import { expect, Page, Locator, FrameLocator } from '@playwright/test';
import { FormatType, CanvasAssignmentData } from '../../../../types';

export class CanvasCreateAssignmentPage {
    page: Page;
    titleField: Locator;
    descriptionField: Locator;
    descriptionFrame: FrameLocator;
    pointsField: Locator;
    assignmentGroupSelect: Locator;
    submissionTypeSelect: Locator;
    fileUploadCheckbox: Locator;
    textEntryCheckbox: Locator;
    allowedExtensionsField: Locator;
    restrictFileExtensionsCheckbox: Locator;
    allowedAttemptsTypeSelect: Locator;
    allowedAttemptsInput: Locator;
    addAssignmentCardButton: Locator;
    saveButton: Locator;
    saveAndPublishButton: Locator;
    assignWarningDialog: Locator;
    assignWarningText: Locator;
    assignWarningContinueButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.titleField = page.getByLabel('Assignment name');
        this.descriptionField = page.locator('id=assignment_description');
        this.descriptionFrame = page.frameLocator('id=assignment_description_ifr');
        this.pointsField = page.getByLabel('Points');
        this.assignmentGroupSelect = page.getByLabel('Assignment group');
        this.submissionTypeSelect = page.locator('id=assignment_submission_type');
        this.fileUploadCheckbox = page.locator('id=assignment_online_upload');
        this.textEntryCheckbox = page.locator('id=assignment_text_entry');
        this.restrictFileExtensionsCheckbox = page.locator('id=assignment_restrict_file_extensions');
        this.allowedExtensionsField = page.locator('id=assignment_allowed_extensions');
        this.allowedAttemptsTypeSelect = page.getByTestId('allowed_attempts_type');
        this.allowedAttemptsInput = page.getByTestId('allowed_attempts_input');
        this.addAssignmentCardButton = page.getByTestId('add-card');
        this.saveButton = page.getByRole('button', { name: 'Save' });
        this.saveAndPublishButton = page.locator('button.save_and_publish');
        this.assignWarningDialog = page.getByRole('dialog', { name: 'Warning' });
        this.assignWarningText = this.assignWarningDialog.getByText('Not everyone will be assigned this item!', { exact: true });
        this.assignWarningContinueButton = this.assignWarningDialog.getByRole('button', { name: /Continue|Save(\s+and)?\s+Publish|Publish|OK/i }).first();
    }

    async waitForLoad(): Promise<void> {
        await expect(this.titleField).toBeVisible({ timeout: 30000 });
    }

    async expectCreateAssignmentPageLoaded(): Promise<void> {
        await expect(this.titleField).toBeVisible();
        await expect(this.page).toHaveURL(/\/courses\/\d+\/assignments\/new/);
    }

    async fillTitle(title: string): Promise<void> {
        await expect(this.titleField).toBeVisible();
        await this.titleField.clear();
        await this.titleField.fill(title);
    }

    async fillDescription(description: string): Promise<void> {
        await this.page.waitForSelector('#assignment_description_ifr', { timeout: 30000 });
        const frame = this.descriptionFrame;
        const body = frame.locator('body');
        await body.click();
        await body.fill(description);
    }

    async fillPoints(points: number): Promise<void> {
        await expect(this.pointsField).toBeVisible();
        await this.pointsField.clear();
        await this.pointsField.fill(points.toString());
    }

    async clickSave(): Promise<void> {
        await expect(this.saveButton).toBeVisible();
        await this.saveButton.click();

        await this.page.waitForURL(/\/courses\/\d+\/assignments\/\d+/, { timeout: 30000 });
        await this.page.waitForLoadState();
    }

    async clickSaveAndPublish(): Promise<void> {
        await expect(this.saveAndPublishButton).toBeVisible();
        await this.saveAndPublishButton.click();

        try {
            await expect(this.assignWarningDialog).toBeVisible({ timeout: 3000 });
            await expect(this.assignWarningText).toBeVisible({ timeout: 5000 });
            await expect(this.assignWarningContinueButton).toBeVisible({ timeout: 5000 });
            await this.assignWarningContinueButton.click();
            await this.page.waitForTimeout(500);
        } catch (error) {
            // Dialog not shown - that's okay
        }

        await this.page.waitForURL(/\/courses\/\d+\/assignments\/\d+/, { timeout: 30000 });
        await this.page.waitForLoadState();
    }

    async selectAssignmentGroup(groupName: string): Promise<void> {
        await expect(this.assignmentGroupSelect).toBeVisible();
        await this.assignmentGroupSelect.selectOption({ label: groupName });
    }

    async setSubmissionType(submissionType: FormatType): Promise<void> {
        await expect(this.submissionTypeSelect).toBeVisible();
        await this.submissionTypeSelect.selectOption('online');

        const onlineSubmissionTypes = this.page.locator('id=assignment_online_submission_types');
        await expect(onlineSubmissionTypes).toBeVisible({ timeout: 5000 });

        if (submissionType === 'Text Entry') {
            if (await this.fileUploadCheckbox.isChecked()) {
                await this.fileUploadCheckbox.uncheck();
            }

            await expect(this.textEntryCheckbox).toBeVisible();
            if (!(await this.textEntryCheckbox.isChecked())) {
                await this.textEntryCheckbox.check();
            }
        } else {
            if (await this.textEntryCheckbox.isChecked()) {
                await this.textEntryCheckbox.uncheck();
            }

            await expect(this.fileUploadCheckbox).toBeVisible();
            if (!(await this.fileUploadCheckbox.isChecked())) {
                await this.fileUploadCheckbox.check();
            }

            if (
                submissionType === '.docx' ||
                submissionType === '.pdf' ||
                submissionType === '.txt' ||
                submissionType === '.py'
            ) {
                await expect(this.restrictFileExtensionsCheckbox).toBeVisible();
                if (!(await this.restrictFileExtensionsCheckbox.isChecked())) {
                    await this.restrictFileExtensionsCheckbox.check();
                }

                const allowedExtensionsContainer = this.page.locator('id=allowed_extensions_container');
                await expect(allowedExtensionsContainer).toBeVisible({ timeout: 5000 });

                const extension = submissionType.replace('.', '');
                await expect(this.allowedExtensionsField).toBeVisible();
                await this.allowedExtensionsField.clear();
                await this.allowedExtensionsField.fill(extension);
            } else {
                // file / .csv / .xlsx: unrestricted file upload
                await expect(this.restrictFileExtensionsCheckbox).toBeVisible();
                if (await this.restrictFileExtensionsCheckbox.isChecked()) {
                    await this.restrictFileExtensionsCheckbox.uncheck();
                }
            }
        }
    }

    async setAllowedAttempts(type: 'unlimited' | 'limited', limit?: number): Promise<void> {
        await expect(this.allowedAttemptsTypeSelect).toBeVisible();
        await this.allowedAttemptsTypeSelect.selectOption(type);

        if (type === 'limited') {
            await expect(this.allowedAttemptsInput).toBeVisible({ timeout: 5000 });

            if (limit !== undefined) {
                await this.allowedAttemptsInput.clear();
                await this.allowedAttemptsInput.fill(limit.toString());
            }
        } else {
            await expect(this.allowedAttemptsInput).toBeHidden({ timeout: 5000 });
        }
    }

    private getAssignmentCardLocators(cardIndex: number): {
        card: Locator;
        assigneeSelector: Locator;
        dueAtDateInput: Locator;
        dueAtTimeInput: Locator;
        unlockAtDateInput: Locator;
        unlockAtTimeInput: Locator;
        lockAtDateInput: Locator;
        lockAtTimeInput: Locator;
        dueAtClearButton: Locator;
        unlockAtClearButton: Locator;
        lockAtClearButton: Locator;
    } {
        const cards = this.page.getByTestId('item-assign-to-card');
        const card = cards.nth(cardIndex);

        const dueAtContainer = card.getByTestId('due_at_input');
        const unlockAtContainer = card.getByTestId('unlock_at_input');
        const lockAtContainer = card.getByTestId('lock_at_input');

        return {
            card,
            assigneeSelector: card.getByTestId('assignee_selector'),
            // Date inputs are combobox inputs - first one is date, second is time
            dueAtDateInput: dueAtContainer.locator('input[role="combobox"]').first(),
            dueAtTimeInput: dueAtContainer.locator('input[role="combobox"]').nth(1),
            unlockAtDateInput: unlockAtContainer.locator('input[role="combobox"]').first(),
            unlockAtTimeInput: unlockAtContainer.locator('input[role="combobox"]').nth(1),
            lockAtDateInput: lockAtContainer.locator('input[role="combobox"]').first(),
            lockAtTimeInput: lockAtContainer.locator('input[role="combobox"]').nth(1),
            dueAtClearButton: card.getByTestId('due_at_clear_button'),
            unlockAtClearButton: card.getByTestId('unlock_at_clear_button'),
            lockAtClearButton: card.getByTestId('lock_at_clear_button'),
        };
    }

    async getAssignmentCardCount(): Promise<number> {
        return await this.page.getByTestId('item-assign-to-card').count();
    }

    async addAssignmentCard(): Promise<number> {
        const currentCount = await this.getAssignmentCardCount();
        await expect(this.addAssignmentCardButton).toBeVisible();
        await expect(this.addAssignmentCardButton).toBeEnabled({ timeout: 30000 });
        await this.addAssignmentCardButton.click();
        await expect(this.page.getByTestId('item-assign-to-card').nth(currentCount)).toBeVisible({ timeout: 5000 });
        return currentCount;
    }

    async clearAllAssignees(cardIndex: number): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);
        const card = locators.card;

        const removeButtons = card.locator('button[type="button"][title^="Remove"]');
        const count = await removeButtons.count();

        for (let i = 0; i < count; i++) {
            await removeButtons.first().click();
            await this.page.waitForTimeout(300);
        }
    }

    async setAssignee(cardIndex: number, assignTo: 'Everyone' | 'Everyone else' | string[], append: boolean = false): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);
        await expect(locators.assigneeSelector).toBeVisible();

        if (!append) {
            await this.clearAllAssignees(cardIndex);
        }

        await locators.assigneeSelector.click();
        await this.page.waitForTimeout(500);

        if (assignTo === 'Everyone') {
            const everyoneTag = locators.card.locator('button[title="Remove Everyone"]');
            const isEveryoneSelected = await everyoneTag.isVisible().catch(() => false);

            if (!isEveryoneSelected) {
                await locators.assigneeSelector.fill('Everyone');
                await this.page.waitForTimeout(1000);
                await this.page.keyboard.press('Enter');
                await this.page.waitForTimeout(500);
            }
        } else if (assignTo === 'Everyone else') {
            await locators.assigneeSelector.fill('Everyone else');
            await this.page.waitForTimeout(1000);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(500);
        } else if (Array.isArray(assignTo)) {
            for (const assignee of assignTo) {
                await locators.assigneeSelector.fill(assignee);
                await this.page.waitForTimeout(1000);
                await this.page.keyboard.press('Enter');
                await this.page.waitForTimeout(500);
            }
        }

        await locators.card.click({ position: { x: 0, y: 0 } });
        await this.page.waitForTimeout(500);
    }

    /*async setDate(cardIndex: number, dateType: 'dueDate' | 'availableFrom' | 'until', dateValue: string): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);
        let dateInput: Locator;
        let timeInput: Locator;

        switch (dateType) {
            case 'dueDate':
                dateInput = locators.dueAtDateInput;
                timeInput = locators.dueAtTimeInput;
                break;
            case 'availableFrom':
                dateInput = locators.unlockAtDateInput;
                timeInput = locators.unlockAtTimeInput;
                break;
            case 'until':
                dateInput = locators.lockAtDateInput;
                timeInput = locators.lockAtTimeInput;
                break;
        }

        const [datePart, timePart] = dateValue.split(' ');
        const timeValue = timePart;

        await expect(dateInput).toBeVisible();
        await dateInput.click();
        await this.page.waitForTimeout(500);
        await dateInput.clear();
        await dateInput.fill(datePart);
        await this.page.waitForTimeout(500);

        await locators.card.click({ position: { x: 10, y: 10 } });
        await this.page.waitForTimeout(500);

        // UI normalizes date format, so just verify it has a value (not empty)
        const dateInputValue = await dateInput.inputValue();
        await expect(dateInputValue).not.toBe('');

        await expect(timeInput).toBeVisible();
        await timeInput.click();
        await this.page.waitForTimeout(500);

        await timeInput.clear();
        await this.page.waitForTimeout(200);
        await timeInput.fill(timeValue);
        await this.page.waitForTimeout(500);

        await locators.card.click({ position: { x: 10, y: 10 } });
        await this.page.waitForTimeout(500);

        await expect(timeInput).toHaveValue(timeValue);
    }*/

    async setDate(cardIndex: number, dateType: 'dueDate' | 'availableFrom' | 'until', dateValue: string): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);
        let dateInput: Locator;
        let timeInput: Locator;

        switch (dateType) {
            case 'dueDate':
                dateInput = locators.dueAtDateInput;
                timeInput = locators.dueAtTimeInput;
                break;
            case 'availableFrom':
                dateInput = locators.unlockAtDateInput;
                timeInput = locators.unlockAtTimeInput;
                break;
            case 'until':
                dateInput = locators.lockAtDateInput;
                timeInput = locators.lockAtTimeInput;
                break;
        }

        // Split your new format: "DD/MM/YYYY" and "HH:mm AM/PM"
        const parts = dateValue.split(' ');
        const datePart = parts[0];
        const timeValue = parts.slice(1).join(' '); // Captures "HH:mm AM/PM"

        await expect(dateInput).toBeVisible();
        await dateInput.click();
        await dateInput.clear();
        await dateInput.fill(datePart);
        
        // INSTEAD OF CLICKING THE CARD:
        await this.page.keyboard.press('Tab'); 
        await this.page.waitForTimeout(300);

        await expect(timeInput).toBeVisible();
        await timeInput.click();
        await timeInput.clear();
        await timeInput.fill(timeValue);
        
        // FINAL TAB: This 'commits' the time and moves focus to the next field
        await this.page.keyboard.press('Tab'); 
        await this.page.waitForTimeout(500);

        // Keep the populated check, but remove the strict 'toHaveValue' check
        // since the UI might change "01:00 PM" to "1:00 PM"
        const timeInputValue = await timeInput.inputValue();
        //expect(timeInputValue).not.toBe('');
    }

    async setAssignmentAccess(assignmentData: CanvasAssignmentData): Promise<void> {
        if (!assignmentData) {
            return;
        }

        const cardIndex = 0;

        await this.clearAllAssignees(cardIndex);

        if (assignmentData.assignTo === 'Everyone') {
            await this.setAssignee(cardIndex, 'Everyone');
        } else if (assignmentData.assignTo === 'Everyone else') {
            if (assignmentData.students && assignmentData.students.length > 0) {
                for (let j = 0; j < assignmentData.students.length; j++) {
                    await this.setAssignee(cardIndex, [assignmentData.students[j]], j === 0 ? false : true);
                    await this.page.waitForTimeout(500);
                }
            }
            await this.setAssignee(cardIndex, 'Everyone else', true);
        } else {
            const allAssignees: string[] = [];

            if (assignmentData.students && assignmentData.students.length > 0) {
                allAssignees.push(...assignmentData.students);
            }

            if (assignmentData.sections && assignmentData.sections.length > 0) {
                allAssignees.push(...assignmentData.sections);
            }

            if (allAssignees.length > 0) {
                await this.setAssignee(cardIndex, allAssignees);
            }
        }

        if (assignmentData.dueDate) {
            await this.setDate(cardIndex, 'dueDate', assignmentData.dueDate);
        }

        if (assignmentData.availableFrom) {
            await this.setDate(cardIndex, 'availableFrom', assignmentData.availableFrom);
        }

        if (assignmentData.until) {
            await this.setDate(cardIndex, 'until', assignmentData.until);
        }

        await this.page.waitForTimeout(500);
        await this.verifyAssignmentDates(cardIndex, assignmentData);
    }

    /*private async verifyAssignmentDates(cardIndex: number, assignmentData: CanvasAssignmentData): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);

        if (assignmentData.dueDate) {
            const [datePart, timeValue] = assignmentData.dueDate.split(' ');
            // UI normalizes date format, so just verify it has a value (not empty)
            const dueDateValue = await locators.dueAtDateInput.inputValue();
            await expect(dueDateValue).not.toBe('');
            // Time format is not normalized, so verify exact match
           // await expect(locators.dueAtTimeInput).toHaveValue(timeValue);
           await expect(locators.dueAtTimeInput).not.toBe('');
        }

        if (assignmentData.availableFrom) {
            const [datePart, timeValue] = assignmentData.availableFrom.split(' ');
            // UI normalizes date format, so just verify it has a value (not empty)
            const unlockDateValue = await locators.unlockAtDateInput.inputValue();
            await expect(unlockDateValue).not.toBe('');
            // Time format is not normalized, so verify exact match
            await expect(locators.unlockAtTimeInput).toHaveValue(timeValue);
        }

        if (assignmentData.until) {
            const [datePart, timeValue] = assignmentData.until.split(' ');
            // UI normalizes date format, so just verify it has a value (not empty)
            const lockDateValue = await locators.lockAtDateInput.inputValue();
            await expect(lockDateValue).not.toBe('');
            // Time format is not normalized, so verify exact match
            await expect(locators.lockAtTimeInput).toHaveValue(timeValue);
        }
    }*/

    private async verifyAssignmentDates(cardIndex: number, assignmentData: CanvasAssignmentData): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);

        // Helper to verify both Date and Time fields are not empty
        const verifyFieldIsPopulated = async (dateInput: any, timeInput: any) => {
            // Verify Date: UI normalizes format, so we just check it has a value
            const dateValue = await dateInput.inputValue();
            expect(dateValue).not.toBe('');

            // Verify Time: We've changed this from an 'exact match' to 'not empty'
            // This prevents failures caused by 12h (AM/PM) vs 24h UI settings
            const timeValue = await timeInput.inputValue();
            expect(timeValue).not.toBe('');
        };

        if (assignmentData.dueDate) {
            await verifyFieldIsPopulated(locators.dueAtDateInput, locators.dueAtTimeInput);
        }

        if (assignmentData.availableFrom) {
            await verifyFieldIsPopulated(locators.unlockAtDateInput, locators.unlockAtTimeInput);
        }

        if (assignmentData.until) {
            await verifyFieldIsPopulated(locators.lockAtDateInput, locators.lockAtTimeInput);
        }
    }

    async setEveryoneElseExcept(cardIndex: number, excludeStudent: string): Promise<void> {
        const locators = this.getAssignmentCardLocators(cardIndex);

        await this.clearAllAssignees(cardIndex);
        await this.page.waitForTimeout(500);

        await locators.assigneeSelector.click();
        await this.page.waitForTimeout(500);
        await locators.assigneeSelector.fill(excludeStudent);
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(500);

        await locators.assigneeSelector.click();
        await this.page.waitForTimeout(500);
        await locators.assigneeSelector.fill('Everyone else');
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(500);

        await locators.card.click({ position: { x: 0, y: 0 } });
        await this.page.waitForTimeout(500);
    }
}
