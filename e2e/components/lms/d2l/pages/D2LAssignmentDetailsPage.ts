import { expect, Page, Locator } from '@playwright/test';
import { FormatType } from '../../../../types';

export class D2LAssignmentDetailsPage {
    page: Page;
    assignmentTitle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.assignmentTitle = page.locator('h1.d2l-heading-1, h1.d2l-heading-2, h1').first();
    }

    async waitForLoad(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible({ timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }

    async expectAssignmentDetailsLoaded(): Promise<void> {
        await expect(this.assignmentTitle).toBeVisible();
        await expect(this.page).toHaveURL(/\/d2l\/lms\/dropbox\/user\/submission_user_attempt\.d2l/);
    }

    async verifyAssignmentTitle(expectedTitle: string): Promise<void> {
        const assignmentLink = this.page.getByRole('link', { name: expectedTitle });
        await expect(assignmentLink).toBeVisible({ timeout: 30000 });
    }

    /**
     * From the submissions list, open the evaluation view for a specific student
     * using the rendered display name, e.g. "student, amit".
     * Finds the table row containing the display name, then clicks "Go to Evaluation" inside that row.
     */
    async openEvaluationForStudent(studentDisplayName: string): Promise<void> {
        const studentRow = this.page.locator('tr').filter({
            hasText: studentDisplayName
        }).first();

        await expect(
            studentRow,
            `Submissions row for student display name containing "${studentDisplayName}" not found`
        ).toBeVisible({ timeout: 30000 });

        const goToEvalButton = studentRow.getByRole('button', { name: /Go to Evaluation/i });
        await expect(goToEvalButton).toBeVisible({ timeout: 30000 });
        await goToEvalButton.click();

        await this.page.waitForLoadState('domcontentloaded');
    }
}

