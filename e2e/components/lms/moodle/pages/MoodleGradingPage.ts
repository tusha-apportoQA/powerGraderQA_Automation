import { Page, expect } from '@playwright/test';
import { AllureHelper } from '../../../../utils/allureHelper';
import { GradingSummary } from '../../../../types';

export class MoodleGradingPage {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async expectMoodleGradingPageLoaded(): Promise<void> {
        await expect(this.page.getByText('Graded', { exact: true })).toBeVisible();
        console.log('Moodle Grading Page loaded and "Graded" text is visible.');
    }

    async getRubricSnapshot(): Promise<GradingSummary> {
        await AllureHelper.step('Extracting and logging grades from Moodle Grading Page', async () => {
            return;
        });

        const totalGradeLocator = this.page.locator('#fitem_id_currentgrade .currentgrade a');
        const totalGradeText = (await totalGradeLocator.textContent())?.trim() ?? '';

        const criteriaTable = this.page.locator('#advancedgrading-criteria');
        const criteriaRows = await criteriaTable.locator('.criterion').all();
        const criteria: GradingSummary['criteria'] = [];

        for (const row of criteriaRows) {
            const criterionName = ((await row.locator('.description').textContent()) ?? '').trim();
            const checkedLevel = row.locator('.level.currentchecked.checked');
            const scoreText = ((await checkedLevel.locator('.scorevalue').textContent()) ?? '').trim();
            const feedback = await row.locator('.remark textarea').inputValue();
            const points = Number(scoreText.match(/[\d.]+/)?.[0] ?? NaN);

            criteria.push({
                name: criterionName,
                points,
                feedback: feedback.trim(),
            });
        }

        const summary: GradingSummary = {
            totalScore: totalGradeText,
            criteria,
        };
        console.log('[MoodleGradingPage] LMS GradingSummary (scraped):', summary);
        return summary;
    }

    /**
     * Expand Comments on the grading UI, then assert submission comment text (same pattern as D2L):
     * at least one `getByText(..., { exact: true })` and the **first** match is visible.
     */
    async hasSubmissionCommentVisible(expected: string): Promise<boolean> {
        const commentsControl = this.page.getByRole('button', { name: /^Comments Comments \(\d+\)$/ });
        await expect(commentsControl).toBeVisible({ timeout: 10000 });
        await commentsControl.click();
        await this.page.waitForTimeout(500);

        const commentText = this.page.getByText(expected, { exact: true });

        if ((await commentText.count()) === 0) {
            return false;
        }
        return await commentText.first().isVisible().catch(() => false);
    }
}
