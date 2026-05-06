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
    criterionDescriptionInput: Locator;
    criterionPointsInput: Locator;
    saveCriterionButton: Locator;
    removeRatingButton: Locator;
    addRatingRowButton: Locator;
    ratingNameInput: Locator;
    ratingPointsInput: Locator;
    speedGraderLink: Locator;

    constructor(page: Page) {
        this.page = page;
        //this.assignmentTitle = page.locator('.assignment-title h1.title');
        this.assignmentTitle = page.locator('.assignment-title .title-content');
        this.startAssignmentButton = page.getByRole('button', { name: 'Start Assignment' });
        this.fileTypesValue = page.locator('ul.student-assignment-overview li').filter({
            has: page.locator('span.title', { hasText: 'File types' })
        }).locator('span.value');

        this.addRubricButton = page.getByTestId('create-assignment-rubric-button');
        this.findRubricButton = page.getByTestId('find-assignment-rubric-button');
        this.rubricTitleOnPage = page.locator('#enhanced-rubric-assignment-edit-mount-point');

        // Tray Locators
        this.courseDropdown = page.getByTestId('rubric-context-select');
        this.newRubricTitleInput = page.getByTestId('rubric-form-title');
        this.draftNewCriterionButton = page.getByTestId('add-criterion-button');
        this.saveRubricButton = page.getByTestId('save-rubric-button');

        // Modal Locators
        this.criterionDialog = page.getByTestId('rubric-criterion-modal')
        this.criterionNameInput = page.getByTestId('rubric-criterion-name-input');
        this.criterionDescriptionInput = page.getByTestId('rubric-criterion-description-input');
        this.criterionPointsInput = page.getByTestId('max-points-input');
        this.saveCriterionButton = page.getByTestId('rubric-criterion-save');
        this.removeRatingButton = this.criterionDialog.getByTestId('remove-rating');
        this.addRatingRowButton = this.criterionDialog.getByTestId('add-rating-row');
        this.ratingNameInput = this.criterionDialog.getByTestId('rating-name');
        this.ratingPointsInput = this.criterionDialog.getByTestId('rating-points');
        this.speedGraderLink = page.getByRole('link', { name: 'SpeedGrader' }).last();
    }

    async waitForLoad(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
    }

    async verifyAssignmentTitle(expectedTitle: string): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
        await expect(this.assignmentTitle).toHaveText(expectedTitle);
    }

    /**
     * Opens the Canvas SpeedGrader for this assignment in a new tab and returns the grading page.
     */
    async openSpeedGrader(): Promise<Page> {
        await expect(this.speedGraderLink).toBeVisible({ timeout: 30000 });

        const [gradingPage] = await Promise.all([
            this.page.context().waitForEvent('page'),
            this.speedGraderLink.click()
        ]);

        await gradingPage.waitForLoadState('domcontentloaded');
        await gradingPage.waitForURL(/\/gradebook\/speed_grader\?assignment_id=\d+/, {
            timeout: 30000,
        });
        return gradingPage;
    }

    async clickStartAssignment(): Promise<void> {
        await this.page.waitForLoadState('load');
        await this.page.waitForLoadState('networkidle');
        await expect(this.startAssignmentButton).toBeVisible({ timeout: 30000 });
        await expect(this.startAssignmentButton).toBeEnabled({ timeout: 30000 });
        await this.page.waitForTimeout(1000);
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

    /*
    // Backup (old flow) - kept for reference.
    // This version depended on row-level test id and older Add button id.
    private async attachExistingRubric(groupName: string, rubricName: string): Promise<void> {
        console.log(`[CanvasLMS] Searching for Rubric: "${rubricName}" in Context: "${groupName}"`);
        await this.findRubricButton.click({ force: true });

        await expect(this.courseDropdown).toBeVisible({ timeout: 15000 });
        await this.courseDropdown.click();
        await this.page.getByRole('option', { name: groupName, exact: true }).first().click();

        const row = this.page.getByTestId('rubric-search-row').filter({ hasText: rubricName }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
        await row.getByRole('radio').check({ force: true });

        const addButton = this.page.getByTestId('save-assessment-rubric-button');
        await expect(addButton).toBeVisible({ timeout: 10000 });
        await addButton.click();

        await expect(this.rubricTitleOnPage).toContainText(rubricName, { timeout: 15000 });
    }
    */

    // Updated by amit:
    // 1) Uses `rubric-search-row-title` (since `rubric-search-row` was removed in new UI).
    // 2) Finds the related radio via structural ancestor lookup and clicks label by `for=<radioId>`.
    // 3) Uses new Add button test id: `save-rubric-assessment-button`.
    // 4) Keeps strict post-add verification for the chosen rubric title.
    private async attachExistingRubric(groupName: string, rubricName: string): Promise<void> {
        console.log(`[CanvasLMS] Searching for Rubric: "${rubricName}" in Context: "${groupName}"`);
        await this.findRubricButton.click({ force: true });

        // 1. Select Course
        await expect(this.courseDropdown).toBeVisible({ timeout: 15000 });
        await this.courseDropdown.click();
        await this.page.getByRole('option', { name: groupName, exact: true }).first().click();

        // 2. Select target rubric by title test id, then click its related radio label.
        const exactTitle = this.page.getByTestId('rubric-search-row-title').filter({
            hasText: rubricName
        }).first();
        await expect(exactTitle).toBeVisible({ timeout: 15000 });

        const rowContainer = exactTitle.locator('xpath=ancestor::*[.//input[@type="radio"]][1]');
        const radioInput = rowContainer.locator('input[type="radio"]').first();
        await expect(radioInput).toBeAttached({ timeout: 10000 });

        const radioId = await radioInput.getAttribute('id');
        if (radioId) {
            await this.page.locator(`label[for="${radioId}"]`).first().click({ force: true });
        } else {
            // Fallback for unexpected markup: click available label inside the same row container.
            await rowContainer.locator('label[for], label').first().click({ force: true });
        }

        console.log(`[DEBUG] Successfully selected rubric: ${rubricName}`);

        // 3. Click "+ Add" (Wait for it to become enabled naturally)
        const addButton = this.page.getByTestId('save-rubric-assessment-button');
        
        await expect(addButton).toBeVisible({ timeout: 10000 });
        // This line is critical: it ensures the selection click actually worked
        await expect(addButton).toBeEnabled({ timeout: 10000 });
        await addButton.click();

        // 4. Verification
        await expect(this.rubricTitleOnPage).toBeVisible({ timeout: 15000 });
        // Precise verification: ensure the exact rubric name text is visible inside the mount point.
        await expect(this.rubricTitleOnPage.getByText(rubricName, { exact: true })).toBeVisible({ timeout: 15000 });
    }

    /*
    // Backup (old flow) - kept for reference.
    // This version relied on default rating rows and did not align/remove/add ratings from config.
    private async createNewRubric(rubric: NewRubricConfig): Promise<void> {
        await this.addRubricButton.click();
        await expect(this.newRubricTitleInput).toBeVisible();
        await this.newRubricTitleInput.fill(rubric.title);

        for (let i = 0; i < rubric.criteria.length; i++) {
            const criterion = rubric.criteria[i];
            await this.draftNewCriterionButton.last().click();
            await expect(this.criterionDialog).toBeVisible();

            await this.criterionNameInput.fill(criterion.description);
            await this.criterionDescriptionInput.fill(criterion.longDescription || '');
            await this.criterionPointsInput.fill(criterion.maxPoints.toString());

            await this.saveCriterionButton.click();
            await expect(this.criterionDialog).toBeHidden();
        }

        await this.saveRubricButton.click();
        await expect(this.rubricTitleOnPage).toBeVisible();
    }
    */

    // Updated by amit:
    // 1) Uses new rubric title input test id (`rubric-form-title`).
    // 2) Dynamically matches rating-row count to config by remove/add actions.
    // 3) Fills each rating level using `rating-name` and `rating-points`.
    private async createNewRubric(rubric: NewRubricConfig): Promise<void> {
        await this.addRubricButton.click();
        await expect(this.newRubricTitleInput).toBeVisible();
        await this.newRubricTitleInput.fill(rubric.title);

        for (let i = 0; i < rubric.criteria.length; i++) {
            const criterion = rubric.criteria[i];
            await this.draftNewCriterionButton.last().click();
            await expect(this.criterionDialog).toBeVisible();

            await this.criterionNameInput.fill(criterion.description);
            await this.criterionDescriptionInput.fill(criterion.longDescription || '');
            await this.criterionPointsInput.fill(criterion.maxPoints.toString());

            // Align number of rating rows with config. Detailed rating field edits come next.
            const targetRatingCount = criterion.ratings.length;
            let currentRatingCount = await this.removeRatingButton.count();

            while (currentRatingCount > targetRatingCount) {
                await this.removeRatingButton.first().click();
                await this.page.waitForTimeout(200);
                currentRatingCount = await this.removeRatingButton.count();
            }

            while (currentRatingCount < targetRatingCount) {
                await this.addRatingRowButton.last().click();
                await this.page.waitForTimeout(200);
                currentRatingCount = await this.removeRatingButton.count();
            }

            // Fill rating levels by index (0-based) using current modal fields.
            for (let j = 0; j < targetRatingCount; j++) {
                const rating = criterion.ratings[j];
                await this.ratingNameInput.nth(j).fill(rating.description);
                await this.ratingPointsInput.nth(j).fill(rating.points.toString());
            }

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