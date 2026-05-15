import { Page, Locator } from '@playwright/test';

export class D2LRubricDialog {
    page: Page;
    rubricEditor: Locator;
    addAssociations: Locator;
    appendLevelButton: Locator;
    levelCells: Locator;
    levelsEditor: Locator;
    addCriterionButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.rubricEditor = page.locator('d2l-rubric-editor');
        this.addAssociations = page.locator('d2l-add-associations');
        
        this.levelsEditor = this.rubricEditor.locator("d2l-rubric-levels-editor");
        this.appendLevelButton = this.levelsEditor.getByRole('button', { name: 'Add new level after' });
        this.levelCells = this.levelsEditor.locator('#levels-section').locator("d2l-rubric-level-editor");
        
        // Add Criterion button - located in criteria editor footer
        const criteriaEditor = this.rubricEditor.locator("d2l-rubric-criteria-editor");
        this.addCriterionButton = this.rubricEditor.locator('d2l-button-subtle#add-criterion-btn').first();
    }

    private getAutosaveInput(id: string, parent?: Locator): Locator {
        const baseLocator = parent || this.rubricEditor;
        
        return baseLocator
            .locator(`d2l-rubric-autosaving-input#${id}`)
            .locator('d2l-input-text')
            .locator('input.d2l-input[type="text"]')
            .first();
    }

    async waitForDialogOpen(): Promise<void> {
        await this.rubricEditor.waitFor({ state: 'attached', timeout: 30000 });
        await this.page.waitForTimeout(500);
    }

    async setTitle(title: string): Promise<void> {
        await this.rubricEditor.waitFor({ state: 'attached', timeout: 30000 });
        
        const nameContainer = this.rubricEditor.locator('#rubric-name-container').first();
        await nameContainer.waitFor({ state: 'attached', timeout: 10000 });
        
        const rubricNameInput = this.getAutosaveInput('rubric-name', nameContainer);
        await rubricNameInput.waitFor({ state: 'attached', timeout: 10000 });
        
        await rubricNameInput.clear();
        await rubricNameInput.fill(title);
        await this.page.waitForTimeout(500);
    }

    private getLevelInputs(levelCell: Locator): { nameInput: Locator; pointsInput: Locator } {
        const nameInput = this.getAutosaveInput('level-name', levelCell);
        const pointsInput = this.getAutosaveInput('level-points', levelCell);
        
        return { nameInput, pointsInput };
    }

    private async fillLevelDetails(levelCell: Locator, levelName: string, points: number): Promise<void> {
        const { nameInput, pointsInput } = this.getLevelInputs(levelCell);
        
        await nameInput.waitFor({ state: 'attached', timeout: 10000 });
        await nameInput.clear();
        await nameInput.fill(levelName);
        await nameInput.blur();
        await this.page.waitForTimeout(500);
        
        await pointsInput.waitFor({ state: 'attached', timeout: 10000 });
        await pointsInput.clear();
        await pointsInput.fill(points.toString());
        await pointsInput.blur();
        await this.page.waitForTimeout(500);
    }


    private getLevelByPosition(positionNumber: number): Locator {
        return this.levelsEditor
            .locator(`d2l-rubric-level-editor[position-number="${positionNumber}"]`)
            .first();
    }

    private async getCurrentLevelCount(): Promise<number> {
        return await this.levelCells.count();
    }

    private async getCurrentCriterionCount(): Promise<number> {
        return await this.page.locator('d2l-rubric-criterion-editor').count();
    }

    async configureLevels(levels: Array<{ name: string; points: number }>): Promise<void> {
        await this.rubricEditor.waitFor({ state: 'attached', timeout: 30000 });
        await this.levelsEditor.waitFor({ state: 'attached', timeout: 30000 });
        await this.levelCells.first().waitFor({ state: 'attached', timeout: 10000 });
        await this.page.waitForTimeout(500);
        
        let currentLevelCount = await this.getCurrentLevelCount();
        const targetLevelCount = levels.length;
        
        if (currentLevelCount < targetLevelCount) {
            const levelsToAdd = targetLevelCount - currentLevelCount;
            
            for (let i = 0; i < levelsToAdd; i++) {
                await this.appendLevelButton.waitFor({ state: 'attached', timeout: 10000 });
                await this.appendLevelButton.click();
                await this.page.waitForTimeout(500);
                
                const expectedPosition = currentLevelCount + 1;
                const newLevelCell = this.getLevelByPosition(expectedPosition);
                
                await newLevelCell.waitFor({ state: 'attached', timeout: 10000 });
                
                const newCount = await this.getCurrentLevelCount();
                if (newCount !== expectedPosition) {
                    throw new Error(`Expected ${expectedPosition} levels after adding, but found ${newCount}`);
                }
                
                currentLevelCount = expectedPosition;
            }
        }
        
        for (let i = targetLevelCount - 1; i >= 0; i--) {
            const level = levels[i];
            const positionNumber = i + 1;
            const levelCell = this.getLevelByPosition(positionNumber);
            
            await levelCell.waitFor({ state: 'attached', timeout: 10000 });
            await this.fillLevelDetails(levelCell, level.name, level.points);
        }
        
        await this.page.waitForTimeout(500);
    }

    private getCriterionByPosition(positionNumber: number): Locator {
        return this.page.locator(`d2l-rubric-criterion-editor[position-number="${positionNumber}"]`).first();
    }

    private async fillCriterionName(criterionCell: Locator, name: string): Promise<void> {
        const nameTextarea = criterionCell
            .locator('d2l-input-textarea#input-name')
            .locator('textarea')
            .first();
        
        await nameTextarea.waitFor({ state: 'attached', timeout: 10000 });
        await nameTextarea.clear();
        await nameTextarea.fill(name);
        await nameTextarea.blur();
        await this.page.waitForTimeout(300);
    }

    private async fillCriterionDescription(criterionCell: Locator, levelPosition: number, description: string): Promise<void> {
        const totalLevels = await this.levelCells.count();
        const cellIndex = totalLevels - levelPosition;
        
        const descriptionCell = criterionCell
            .locator('.criterion-cells')
            .locator('.cell')
            .nth(cellIndex);
        
        await descriptionCell.waitFor({ state: 'attached', timeout: 10000 });
        
        const descriptionEditor = descriptionCell.locator('d2l-rubric-description-editor').first();
        await descriptionEditor.waitFor({ state: 'attached', timeout: 10000 });
        
        await descriptionEditor.click();
        await this.page.waitForTimeout(100);
        
        await this.page.keyboard.type(description, { delay: 0 });
        
        await descriptionEditor.blur();
        await this.page.waitForTimeout(300);
    }

    private async fillCriterionFeedback(criterionCell: Locator, levelPosition: number, feedback: string): Promise<void> {
        const totalLevels = await this.levelCells.count();
        const cellIndex = totalLevels - levelPosition;
        
        const feedbackCell = criterionCell
            .locator('.criterion-feedback')
            .locator('.cell')
            .nth(cellIndex);
        
        await feedbackCell.waitFor({ state: 'attached', timeout: 10000 });
        
        const feedbackEditor = feedbackCell.locator('d2l-rubric-feedback-editor').first();
        await feedbackEditor.waitFor({ state: 'attached', timeout: 10000 });
        
        await feedbackEditor.click();
        await this.page.waitForTimeout(100);
        
        await this.page.keyboard.type(feedback, { delay: 0 });
        
        await feedbackEditor.blur();
        await this.page.waitForTimeout(300);
    }

    private async fillCriterionDetails(
        criterionCell: Locator, 
        criterionName: string, 
        levelItems: Array<{ description: string; initialFeedback: string }>
    ): Promise<void> {
        await this.fillCriterionName(criterionCell, criterionName);
        
        for (let i = 0; i < levelItems.length; i++) {
            const levelItem = levelItems[i];
            const levelPosition = i + 1;
            
            await this.fillCriterionDescription(criterionCell, levelPosition, levelItem.description);
            await this.fillCriterionFeedback(criterionCell, levelPosition, levelItem.initialFeedback);
        }
    }

    async configureCriteria(criteria: Array<{ name: string; levelItems: Array<{ description: string; initialFeedback: string }> }>): Promise<void> {
        const criteriaEditor = this.rubricEditor.locator("d2l-rubric-criteria-editor");
        await criteriaEditor.waitFor({ state: 'attached', timeout: 30000 });
        
        await this.page.locator('d2l-rubric-criterion-editor[position-number="1"]').waitFor({ state: 'attached', timeout: 10000 });
        await this.page.waitForTimeout(500);
        
        let currentCriterionCount = await this.getCurrentCriterionCount();
        const targetCriterionCount = criteria.length;
        
        if (currentCriterionCount < targetCriterionCount) {
            const criteriaToAdd = targetCriterionCount - currentCriterionCount;
            
            for (let i = 0; i < criteriaToAdd; i++) {
                await this.addCriterionButton.waitFor({ state: 'attached', timeout: 10000 });
                await this.addCriterionButton.click();
                await this.page.waitForTimeout(500);
                
                const expectedPosition = currentCriterionCount + 1;
                const newCriterionCell = this.getCriterionByPosition(expectedPosition);
                
                await newCriterionCell.waitFor({ state: 'attached', timeout: 10000 });
                
                const newCount = await this.getCurrentCriterionCount();
                if (newCount !== expectedPosition) {
                    throw new Error(`Expected ${expectedPosition} criteria after adding, but found ${newCount}`);
                }
                
                currentCriterionCount = expectedPosition;
            }
        }
        
        for (let i = 0; i < criteria.length; i++) {
            const criterion = criteria[i];
            const positionNumber = i + 1;
            const criterionCell = this.getCriterionByPosition(positionNumber);
            
            await criterionCell.waitFor({ state: 'attached', timeout: 10000 });
            await this.fillCriterionDetails(criterionCell, criterion.name, criterion.levelItems);
        }
        
        await this.page.waitForTimeout(500);
    }

    async attachRubric(): Promise<void> {
        const dialog = this.page.locator('d2l-dialog-fullscreen#create-new-association-dialog').first();
        
        const attachButton = dialog
            .locator('d2l-button[slot="footer"][primary]')
            .getByRole('button')
            .first();
        
        await attachButton.waitFor({ state: 'attached', timeout: 10000 });
        await attachButton.click();

        await this.page.waitForTimeout(500);
    }

    /** Attach-rubric modal for picking an existing rubric (`d2l-add-associations`, shadow DOM). */
    async waitForAddAssociationsDialogOpen(): Promise<void> {
        await this.addAssociations.waitFor({ state: 'attached', timeout: 30000 });
        await this.page.waitForTimeout(500);
    }

    /**
     * Selects one rubric in the add-associations list by visible name (clicks its `listitem` row).
     */
    async selectExistingRubricByName(rubricName: string): Promise<void> {
        await this.waitForAddAssociationsDialogOpen();

        const rubricLabel = this.page.getByText(rubricName, { exact: true }).first();
        await rubricLabel.waitFor({ state: 'attached', timeout: 30000 });

        const listItem = rubricLabel.locator('xpath=ancestor::*[@role="listitem"][1]');
        await listItem.waitFor({ state: 'attached', timeout: 10000 });
        await listItem.click();
        await this.page.waitForTimeout(300);
    }

    async confirmAddSelectedExistingRubrics(): Promise<void> {
        const addSelectedButton = this.page.getByRole('button', { name: 'Add Selected' });
        await addSelectedButton.waitFor({ state: 'attached', timeout: 10000 });
        await addSelectedButton.click();
        await this.page.waitForTimeout(500);
    }
}
