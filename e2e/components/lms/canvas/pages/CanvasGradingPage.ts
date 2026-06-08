import { expect, Locator, Page } from '@playwright/test';
import { GradingSummary } from '../../../../types';

/** SpeedGrader “Rubric Assessment View Mode” combobox values. */
export type RubricAssessmentViewMode = 'Horizontal' | 'Vertical' | 'Traditional';

/**
 * Canvas SpeedGrader page for a single assignment.
 * Used to verify that the LMS reflects the scores coming from PowerGrader.
 *
 */
export class CanvasGradingPage {
    page: Page;
    selectedStudent: Locator;
    gradeInput: Locator;
    
    modernViewOutOfPoints: Locator;

    constructor(page: Page) {
        this.page = page;
        this.selectedStudent = page.getByTestId('selected-student');
        this.gradeInput = page.getByTestId('grade-input');
        this.modernViewOutOfPoints = page.getByTestId('modern-view-out-of-points');
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForURL(/\/gradebook\/speed_grader\?assignment_id=\d+/, {
            timeout: 30000,
        });
        await expect(this.selectedStudent).toBeVisible({ timeout: 30000 });
        await expect(this.gradeInput).toBeVisible({ timeout: 30000 });
    }

    /**
     * Total assignment score shown in SpeedGrader (earned points as a number, e.g. 13).
     */
    async getTotalGradeFromInput(): Promise<number> {
        await expect(this.gradeInput).toBeVisible({ timeout: 30000 });
        const raw = await this.gradeInput.inputValue();
        return Number(String(raw).trim().match(/[\d.]+/)?.[0] ?? NaN);
    }

    /**
     * Ensures SpeedGrader shows the expected student's submission.
     * Opens the student picker and selects by display name when another student is active.
     */
    async ensureSelectedStudent(expectedName: string): Promise<void> {
        const currentText = (await this.selectedStudent.textContent())?.trim() ?? '';
        if (currentText.toLowerCase().includes(expectedName.toLowerCase())) {
            return;
        }

        console.log(
            `[CanvasGradingPage] Selected student "${currentText}" does not match "${expectedName}". Selecting from dropdown...`,
        );

        const trigger = this.page.getByTestId('student-select-trigger');
        await expect(trigger).toBeVisible({ timeout: 30000 });
        await trigger.click();

        const studentLink = this.page.getByRole('link', { name: expectedName });
        await expect(studentLink).toBeVisible({ timeout: 30000 });
        await studentLink.click();

        await expect(this.selectedStudent).toContainText(expectedName, { ignoreCase: true });
        await expect(this.gradeInput).toBeVisible({ timeout: 30000 });
    }

    /**
     * Sets SpeedGrader **Rubric Assessment View Mode** (Horizontal, Vertical, or Traditional).
     */
    async setRubricAssessmentViewMode(mode: RubricAssessmentViewMode): Promise<void> {
        /*const combo = this.page.getByRole('combobox', { name: 'View Mode' })
        await expect(combo).toBeVisible({ timeout: 30000 });
        await combo.click();
        await this.page.getByRole('option', { name: mode, exact: true }).click();*/
        try {
            const combo = this.page.getByRole('combobox', { name: 'View Mode' });
            await expect(combo).toBeVisible({ timeout: 5000 });
            await combo.click();
            await this.page.getByRole('option', { name: mode, exact: true }).click();
        } catch {
            console.log('[CanvasGradingPage] View Mode combobox not found, skipping...');
        }
    }

    /**
     * Horizontal rubric view: scrapes per-row score + feedback, then total from `grade-input`.
     * `totalScore` is the earned points string (e.g. `"13"`) for Canvas total comparison.
     */
    async getRubricSnapshot(): Promise<GradingSummary> {
        await this.setRubricAssessmentViewMode('Horizontal');

        await expect(this.modernViewOutOfPoints.first()).toBeVisible({ timeout: 30000 });

        const rowCount = await this.modernViewOutOfPoints.count();
        const commentTextAreas = this.page.locator('[data-testid^="comment-text-area-"]');

        const criteria: GradingSummary['criteria'] = [];
        for (let i = 0; i < rowCount; i++) {
            const row = this.modernViewOutOfPoints.nth(i);
            await row.scrollIntoViewIfNeeded();
            const scoreInput = row.locator('input').first();
            await expect(scoreInput).toBeVisible({ timeout: 10000 });
            const scoreValue = await scoreInput.inputValue();
            console.log(`[CanvasGradingPage] modern-view-out-of-points[${i}] score:`, scoreValue);

            const feedbackTextarea = commentTextAreas.nth(i);
            await feedbackTextarea.scrollIntoViewIfNeeded();
            await expect(feedbackTextarea).toBeVisible({ timeout: 10000 });
            const feedback = await feedbackTextarea.inputValue();
            console.log(`[CanvasGradingPage] criterion[${i}] feedback (textarea):`, feedback);

            const points = Number(String(scoreValue).trim().match(/[\d.]+/)?.[0] ?? NaN);
            criteria.push({ name: '', points, feedback });
        }

        await expect(this.gradeInput).toBeVisible({ timeout: 30000 });
        const earnedTotal = await this.getTotalGradeFromInput();

        return {
            totalScore: String(earnedTotal),
            criteria,
        };
    }

    async getSubmissionCommentText(): Promise<string | null> {
        const comment = this.page.getByTestId('comment-0-text');
        const visible = await comment.isVisible().catch(() => false);
        if (!visible) return null;
        const text = await comment.textContent();
        return text?.trim() ?? '';
    }
}
