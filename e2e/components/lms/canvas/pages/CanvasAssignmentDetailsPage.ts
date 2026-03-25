import { expect, Page, Locator } from '@playwright/test';
import { AssignmentRubricConfig, NewRubricConfig } from '../../../../types';

export class CanvasAssignmentDetailsPage {
    page: Page;
    assignmentTitle: Locator;
    startAssignmentButton: Locator;
    fileTypesValue: Locator;

    // Rubric UI Locators (Main Page)
    addRubricButton: Locator;
    findRubricButton: Locator;
    rubricTitleOnPage: Locator;

    // Tray & Modal Locators
    courseDropdown: Locator;
    newRubricTitleInput: Locator;
    draftNewCriterionButton: Locator;
    saveRubricButton: Locator;
    criterionDialog: Locator;
    criterionNameInput: Locator;
    criterionPointsInput: Locator;
    saveCriterionButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.assignmentTitle = page.locator('.assignment-title h1.title');
        this.startAssignmentButton = page.getByRole('button', { name: 'Start Assignment' });
        this.fileTypesValue = page.locator('ul.student-assignment-overview li').filter({
            has: page.locator('span.title', { hasText: 'File types' })
        }).locator('span.value');

        this.addRubricButton = page.getByTestId('create-assignment-rubric-button');
        this.findRubricButton = page.getByTestId('find-assignment-rubric-button');
        this.rubricTitleOnPage = page.locator('#rubrics .rubric_title .displaying .title');

        // Tray Locators
        this.courseDropdown = page.getByTestId('rubric-context-select');
        this.newRubricTitleInput = page.getByTestId('rubric-form-title-input');
        this.draftNewCriterionButton = page.getByTestId('add-criterion-button');
        this.saveRubricButton = page.getByTestId('save-rubric-button');

        // Modal Locators
        this.criterionDialog = page.getByRole('dialog');
        this.criterionNameInput = page.getByTestId('criterion-name-input');
        this.criterionPointsInput = page.getByTestId('points-possible-input');
        this.saveCriterionButton = page.getByTestId('save-criterion-button');
    }

    async waitForLoad(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
    }

    async verifyAssignmentTitle(expectedTitle: string): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
        await expect(this.assignmentTitle).toHaveText(expectedTitle);
    }

    async clickStartAssignment(): Promise<void> {
        await expect(this.startAssignmentButton).toBeVisible({ timeout: 30000 });
        await this.startAssignmentButton.click();
    }

    async setRubric(rubric: AssignmentRubricConfig): Promise<void> {
        if (rubric.type === 'no') return;
        if (rubric.type === 'new') {
            await this.createNewRubric(rubric as unknown as NewRubricConfig);
        } else if ('groupName' in rubric) {
            await this.attachExistingRubric(rubric.groupName, rubric.rubricName);
        }
    }

    private async attachExistingRubric(groupName: string, rubricName: string): Promise<void> {
        console.log(`[CanvasLMS] Searching for Rubric: "${rubricName}" in Course: "${groupName}"`);
        await this.findRubricButton.click({ force: true });

        // 1. Select Course
        await expect(this.courseDropdown).toBeVisible({ timeout: 15000 });
        await this.courseDropdown.click();
        await this.page.getByRole('option', { name: groupName, exact: true }).first().click();

        // 2. Traverse the list by Rows
        // Targeting the row container instead of just the title span
        const rows = this.page.getByTestId('rubric-search-row');
        await expect(rows.first()).toBeVisible({ timeout: 15000 });

        const count = await rows.count();
        let found = false;

        for (let i = 0; i < count; i++) {
            const currentRow = rows.nth(i);
            const titleSpan = currentRow.getByTestId('rubric-search-row-title');
            const text = await titleSpan.innerText();
            
            console.log(`[DEBUG] Row ${i} Title: "${text.trim()}"`);

            if (text.trim() === rubricName) {
                // Click the ROW container to trigger the radio button/selection state
                await currentRow.click();
                found = true;
                console.log(`[DEBUG] Successfully selected rubric: ${rubricName}`);
                break;
            }
        }

        if (!found) {
            throw new Error(`Rubric "${rubricName}" not found in the search results.`);
        }

        // 3. Click "+ Add" (Wait for it to become enabled naturally)
        const addButton = this.page.getByTestId('save-assessment-rubric-button');
        
        await expect(addButton).toBeVisible({ timeout: 10000 });
        // This line is critical: it ensures the selection click actually worked
        await expect(addButton).toBeEnabled({ timeout: 10000 });
        await addButton.click();

        // 4. Verification
        await expect(this.rubricTitleOnPage).toBeVisible({ timeout: 15000 });
        await expect(this.rubricTitleOnPage).toContainText(rubricName);
    }

    private async createNewRubric(rubric: NewRubricConfig): Promise<void> {
        await this.addRubricButton.click();
        await expect(this.newRubricTitleInput).toBeVisible();
        await this.newRubricTitleInput.fill(rubric.title);

        for (let i = 0; i < rubric.criteria.length; i++) {
            const criterion = rubric.criteria[i];
            await this.draftNewCriterionButton.last().click();
            await expect(this.criterionDialog).toBeVisible();

            await this.criterionNameInput.fill(criterion.description);
            await this.criterionPointsInput.fill(criterion.maxPoints.toString());

            await this.saveCriterionButton.click();
            await expect(this.criterionDialog).toBeHidden();
        }

        await this.saveRubricButton.click();
        await expect(this.rubricTitleOnPage).toBeVisible();
    }

    async verifyFileType(expectedSubmissionType: string): Promise<void> {
        if (expectedSubmissionType === 'Text Entry') {
            const submittingValue = this.page.locator('ul.student-assignment-overview li').filter({
                has: this.page.locator('span.title', { hasText: 'Submitting' })
            }).locator('span.value');
            await expect(submittingValue).toBeVisible({ timeout: 10000 });
            return;
        }
        await expect(this.fileTypesValue).toBeVisible({ timeout: 10000 });
    }
}