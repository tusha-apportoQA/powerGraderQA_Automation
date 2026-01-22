import { expect, Page, Locator } from '@playwright/test';
import { AssignmentRubricConfig, NewRubricConfig } from '../../../../types';

export class CanvasAssignmentDetailsPage {
    page: Page;
    assignmentTitle: Locator;
    startAssignmentButton: Locator;
    fileTypesValue: Locator;

    // Rubric UI locators
    addRubricButton: Locator;
    findRubricButton: Locator;
    rubricDialog: Locator;
    newRubricContainer: Locator;
    newRubricTitleInput: Locator;
    newRubricTable: Locator;
    createRubricButton: Locator;
    rubricTitleOnPage: Locator;

    // Criterion locators
    criterionRows: Locator;
    criterionMenuButton: Locator;
    criterionDropdownMenu: Locator;
    addCriterionButton: Locator;
    editCriterionLink: Locator;
    editCriterionDialog: Locator;
    addCriterionDialog: Locator;
    updateCriterionButton: Locator;
    createCriterionButton: Locator;

    // Rating locators
    editRatingDialog: Locator;
    ratingPointsInput: Locator;
    ratingTitleInput: Locator;
    ratingDescriptionInput: Locator;
    updateRatingButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.assignmentTitle = page.locator('.assignment-title h1.title');
        this.startAssignmentButton = page.getByRole('button', { name: 'Start Assignment' });
        this.fileTypesValue = page.locator('ul.student-assignment-overview li').filter({
            has: page.locator('span.title', { hasText: 'File types' })
        }).locator('span.value');

        this.addRubricButton = page.getByRole('link', { name: 'Add rubric' });
        this.findRubricButton = page.getByRole('button', { name: 'Find a rubric' });
        this.rubricDialog = page.locator('#rubric_dialog');
        this.newRubricContainer = page.locator('#rubric_new');
        // Chain locators from newRubricContainer to scope elements and avoid conflicts
        this.newRubricTitleInput = this.newRubricContainer.locator('#rubric-title');
        this.newRubricTable = this.newRubricContainer.locator('table.rubric_table');
        
        // Create rubric button - scoped to newRubricContainer, using role-based selector
        this.createRubricButton = this.newRubricContainer.getByRole('button', { name: 'Create rubric' });
        
        // Rubric title on page - scope to #rubrics container to avoid multiple matches
        const rubricsContainer = page.locator('#rubrics');
        this.rubricTitleOnPage = rubricsContainer.locator('.rubric_title .displaying .title');

        // Filter out criterion_blank (hidden) - only get visible criterion rows
        this.criterionRows = this.newRubricTable.locator('tr[id^="criterion_"]:not(#criterion_blank)');
        const rubricFooter = this.newRubricContainer.locator('.rubric-footer');
        this.criterionMenuButton = rubricFooter.getByRole('button', { name: 'Criterion' });
        this.criterionDropdownMenu = page.locator('div[role="menu"][aria-labelledby^="Menu__label_"]');
        this.addCriterionButton = page.locator('#add_criterion_button');
        this.editCriterionLink = this.newRubricTable.locator('a.edit_criterion_link');
        this.editCriterionDialog = page.getByRole('dialog', { name: 'Edit criterion' });
        this.addCriterionDialog = page.getByRole('dialog', { name: 'Add criterion' });
        this.updateCriterionButton = this.editCriterionDialog.getByRole('button', { name: 'Update criterion' });
        this.createCriterionButton = this.addCriterionDialog.getByRole('button', { name: 'Create criterion' });

        this.editRatingDialog = page.getByRole('dialog', { name: 'Edit Rating' });
        this.ratingPointsInput = this.editRatingDialog.locator('input#points');
        this.ratingTitleInput = this.editRatingDialog.locator('input#rating_form_title');
        this.ratingDescriptionInput = this.editRatingDialog.locator('textarea#rating_form_description');
        this.updateRatingButton = this.editRatingDialog.getByRole('button', { name: 'Update Rating' });
    }

    async waitForLoad(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
    }

    async expectAssignmentDetailsLoaded(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible();
        await expect(this.page).toHaveURL(/\/courses\/\d+\/assignments\/\d+/);
    }

    async verifyAssignmentTitle(expectedTitle: string): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
        await expect(this.assignmentTitle).toHaveText(expectedTitle);
    }

    async clickStartAssignment(): Promise<void> {
        await expect(this.startAssignmentButton).toBeVisible({ timeout: 30000 });
        await expect(this.startAssignmentButton).toHaveText('Start Assignment');
        await this.startAssignmentButton.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Verify the file type shown in the UI matches the expected submission type
     * @param expectedSubmissionType - Expected submission type from assignment config (e.g., '.pdf', '.docx', '.txt', 'Text Entry')
     */
    async verifyFileType(expectedSubmissionType: string): Promise<void> {
        if (expectedSubmissionType === 'Text Entry') {
            const submittingValue = this.page.locator('ul.student-assignment-overview li').filter({
                has: this.page.locator('span.title', { hasText: 'Submitting' })
            }).locator('span.value');
            await expect(submittingValue).toBeVisible({ timeout: 10000 });
            const submittingText = await submittingValue.textContent();
            const normalizedText = (submittingText || '').toLowerCase();
            if (!normalizedText.includes('text')) {
                throw new Error(
                    `Submission type mismatch: Expected "Text Entry" but found "${submittingText}" in the UI`
                );
            }
            return;
        }

        await expect(this.fileTypesValue).toBeVisible({ timeout: 10000 });
        const fileTypeText = await this.fileTypesValue.textContent();
        const normalizedExpected = expectedSubmissionType.replace(/^\./, '').toLowerCase();
        const normalizedActual = (fileTypeText || '').trim().toLowerCase();

        if (!normalizedActual.includes(normalizedExpected)) {
            throw new Error(
                `File type mismatch: Expected "${normalizedExpected}" but found "${normalizedActual}" in the UI`
            );
        }
    }

    /**
     * Handle rubric configuration based on rubric type
     * @param rubric - rubric configuration object
     */
    async setRubric(rubric: AssignmentRubricConfig): Promise<void> {
        if (rubric.type === 'no') {
            return;
        }

        if (rubric.type === 'new') {
            await this.createNewRubric(rubric);
            return;
        }

        await this.attachExistingRubric(rubric.groupName, rubric.rubricName);
    }

    private async attachExistingRubric(groupName: string, rubricName: string): Promise<void> {
        await expect(this.addRubricButton).toBeVisible({ timeout: 30000 });
        await this.addRubricButton.click();

        await expect(this.findRubricButton).toBeVisible({ timeout: 30000 });
        await this.findRubricButton.click();

        await expect(this.rubricDialog).toBeVisible({ timeout: 30000 });

        const groupTab = this.rubricDialog
            .locator('ul.rubrics_dialog_contexts_select li.rubrics_dialog_context_select a')
            .filter({ has: this.page.locator('span.name', { hasText: groupName }) })
            .first();
        await expect(groupTab).toBeVisible({ timeout: 30000 });
        await groupTab.click();

        const rubricTab = this.rubricDialog
            .locator('ul.rubrics_dialog_rubrics_select li.rubrics_dialog_rubric_select a')
            .filter({ has: this.page.locator('span.title', { hasText: rubricName }) })
            .first();
        await expect(rubricTab).toBeVisible({ timeout: 30000 });
        await rubricTab.click();

        // Locate the visible rubric container (not hidden with display: none) that contains the selected rubric
        const visibleRubricContainer = this.rubricDialog
            .locator('div.rubrics_dialog_rubric:not([style*="display: none"])')
            .filter({ has: this.page.locator(`b.title:has-text("${rubricName}")`) })
            .first();

        // Use the container to locate the button within it
        const useThisRubricButton = visibleRubricContainer
            .locator('button.select_rubric_link', { hasText: 'Use this rubric' });
        await expect(useThisRubricButton).toBeVisible({ timeout: 30000 });
        await useThisRubricButton.click();

        await expect(this.rubricTitleOnPage).toBeVisible({ timeout: 30000 });
    }

    private async createNewRubric(rubric: NewRubricConfig): Promise<void> {
        await expect(this.addRubricButton).toBeVisible({ timeout: 30000 });
        await this.addRubricButton.click();
        await this.page.waitForTimeout(1000);

        await expect(this.newRubricContainer).toBeVisible({ timeout: 30000 });
        await expect(this.newRubricTable).toBeVisible({ timeout: 30000 });

        await expect(this.newRubricTitleInput).toBeVisible({ timeout: 30000 });
        await this.newRubricTitleInput.clear();
        await this.newRubricTitleInput.fill(rubric.title);
        await this.page.waitForTimeout(500);

        for (let i = 0; i < rubric.criteria.length; i++) {
            const criterion = rubric.criteria[i];

            if (i === 0) {
                // First criterion uses existing row (criterion_1 is pre-created)
                const criterionRow = this.criterionRows.first();
                await expect(criterionRow).toBeVisible({ timeout: 30000 });

                const editLink = criterionRow.locator('a.edit_criterion_link');
                await expect(editLink).toBeVisible({ timeout: 30000 });
                await editLink.click();

                await expect(this.editCriterionDialog).toBeVisible({ timeout: 30000 });

                const descriptionInput = this.editCriterionDialog.locator('textarea.description');
                const longDescriptionInput = this.editCriterionDialog.locator('textarea.long_description');

                await expect(descriptionInput).toBeVisible({ timeout: 30000 });
                await descriptionInput.clear();
                await descriptionInput.fill(criterion.description);
                await this.page.waitForTimeout(300);

                if (criterion.longDescription) {
                    await expect(longDescriptionInput).toBeVisible({ timeout: 30000 });
                    await longDescriptionInput.clear();
                    await longDescriptionInput.fill(criterion.longDescription);
                    await this.page.waitForTimeout(300);
                }

                await expect(this.updateCriterionButton).toBeVisible({ timeout: 30000 });
                await this.updateCriterionButton.click();
                await this.page.waitForTimeout(500);
                await expect(this.editCriterionDialog).toBeHidden({ timeout: 30000 });
            } else {
                // Subsequent criteria: open dropdown menu and click "New criterion"
                await expect(this.criterionMenuButton).toBeVisible({ timeout: 30000 });
                await this.criterionMenuButton.click();

                await expect(this.criterionDropdownMenu).toBeVisible({ timeout: 30000 });

                await expect(this.addCriterionButton).toBeVisible({ timeout: 30000 });
                await this.addCriterionButton.click();
                await expect(this.addCriterionDialog).toBeVisible({ timeout: 30000 });

                const descriptionInput = this.addCriterionDialog.locator('textarea.description');
                const longDescriptionInput = this.addCriterionDialog.locator('textarea.long_description');

                await expect(descriptionInput).toBeVisible({ timeout: 30000 });
                await descriptionInput.clear();
                await descriptionInput.fill(criterion.description);
                await this.page.waitForTimeout(300);

                if (criterion.longDescription) {
                    await expect(longDescriptionInput).toBeVisible({ timeout: 30000 });
                    await longDescriptionInput.clear();
                    await longDescriptionInput.fill(criterion.longDescription);
                    await this.page.waitForTimeout(300);
                }

                await expect(this.createCriterionButton).toBeVisible({ timeout: 30000 });
                await this.createCriterionButton.click();
                await this.page.waitForTimeout(500);
                await expect(this.addCriterionDialog).toBeHidden({ timeout: 30000 });
            }

            const criterionRow = this.criterionRows.nth(i);
            await expect(criterionRow).toBeVisible({ timeout: 30000 });

            const criterionPointsInput = criterionRow.locator('input.criterion_points');
            await expect(criterionPointsInput).toBeVisible({ timeout: 30000 });
            await criterionPointsInput.clear();
            await criterionPointsInput.fill(criterion.maxPoints.toString());
            await this.page.waitForTimeout(300);

            // Edit ratings for this criterion
            for (let j = 0; j < criterion.ratings.length; j++) {
                const rating = criterion.ratings[j];

                const ratingElements = criterionRow.locator('div.rating:not([style*="display: none"])');
                const ratingCount = await ratingElements.count();

                // Skip if we don't have enough ratings (first two are usually pre-created)
                if (j >= ratingCount) {
                    break;
                }

                const currentRating = ratingElements.nth(j);

                const editRatingLink = currentRating.locator('a.edit_rating_link');
                await expect(editRatingLink).toBeVisible({ timeout: 30000 });
                await editRatingLink.click();

                await expect(this.editRatingDialog).toBeVisible({ timeout: 30000 });

                await expect(this.ratingPointsInput).toBeVisible({ timeout: 30000 });
                await this.ratingPointsInput.clear();
                await this.ratingPointsInput.fill(rating.points.toString());
                await this.page.waitForTimeout(300);

                await expect(this.ratingTitleInput).toBeVisible({ timeout: 30000 });
                await this.ratingTitleInput.clear();
                await this.ratingTitleInput.fill(rating.description);
                await this.page.waitForTimeout(300);

                if (rating.longDescription) {
                    await expect(this.ratingDescriptionInput).toBeVisible({ timeout: 30000 });
                    await this.ratingDescriptionInput.clear();
                    await this.ratingDescriptionInput.fill(rating.longDescription);
                    await this.page.waitForTimeout(300);
                }

                await expect(this.updateRatingButton).toBeVisible({ timeout: 30000 });
                await this.updateRatingButton.click();
                await this.page.waitForTimeout(500);
                await expect(this.editRatingDialog).toBeHidden({ timeout: 30000 });
            }
        }

        // Click the "Create rubric" button to save the rubric
        await expect(this.createRubricButton).toBeVisible({ timeout: 30000 });
        await this.createRubricButton.click();

        // Verify the rubric was created by checking the rubric title on the page
        await expect(this.rubricTitleOnPage).toBeVisible({ timeout: 30000 });
    }
}
