import { expect, Page } from '@playwright/test';
import { PowerGraderCoursePage } from './pages/PowerGraderCoursePage';
import { PowerGraderGradingPage } from './pages/PowerGraderGradingPage';
import { GradingSummary } from '../../types';

/** PowerGrader facade for grading, summary extraction, and publish. */
export class PowerGrader {
    readonly page: Page;
    readonly coursePage: PowerGraderCoursePage;
    readonly gradingPage: PowerGraderGradingPage;

    private static readonly POLL_INTERVAL_MS = 30_000;

    constructor(page: Page) {
        this.page = page;
        this.coursePage = new PowerGraderCoursePage(page);
        this.gradingPage = new PowerGraderGradingPage(page);
    }

    /** Grade assignment, extract summary, and publish. */
    async gradeAssignmentAndExtractSummary(assignmentName: string): Promise<GradingSummary> {
        await this.syncCoursePageAndOpenAssignment(assignmentName);
        await this.waitForAiGradingAndStartReviewing(assignmentName);
        await this.waitUntilGradingPagePopulated(assignmentName);
        const summary = await this.gradingPage.getGradingSummary();
        await this.gradingPage.clickPublishButton();
        return summary;
    }

    /** Open target assignment from course list. */
    private async syncCoursePageAndOpenAssignment(assignmentName: string): Promise<void> {
        const interval = PowerGrader.POLL_INTERVAL_MS;
        await expect(async () => {
            console.log(`[${assignmentName}] Course Page Sync: Checking for assignment...`);
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.coursePage.waitForLoad();

            const row = this.page.locator('tr, div[role="row"]').filter({ hasText: assignmentName }).last();
            if (await row.isVisible()) {
                console.log(`[${assignmentName}] Assignment found. Clicking on "View"...`);
                const viewBtn = row
                    .getByRole('link', { name: 'View', exact: true })
                    .or(row.getByText('View', { exact: true }));
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                    viewBtn.first().click(),
                ]);
                await expect(this.page).not.toHaveURL(/.*dashboard.*/);
            } else {
                throw new Error(`[${assignmentName}] Syncing... assignment row not visible yet.`);
            }
        }).toPass({ timeout: 600_000, intervals: [interval] });
    }

    /** Wait for AI grading readiness and enter reviewing mode. */
    private async waitForAiGradingAndStartReviewing(assignmentName: string): Promise<void> {
        const interval = PowerGrader.POLL_INTERVAL_MS;
        await expect(async () => {
            console.log(`[${assignmentName}] Waiting for AI Grading to Complete...`);
            await this.page.reload({ waitUntil: 'networkidle' });

            const generateBtn = this.page.locator('button').filter({ hasText: 'Generate Compatible Rubric' });
            if (await generateBtn.isVisible({ timeout: 2000 })) {
                console.log(`[${assignmentName}] No rubric found. Clicking "Generate Compatible Rubric"...`);
                await generateBtn.click();
                console.log(`[${assignmentName}] Rubric generated. Waiting for AI grading to begin...`);
                await this.page.waitForTimeout(5000);
                throw new Error('Waiting for AI grading after rubric generation...');
            }

            const seeWhyBtn = this.page.getByRole('button', { name: /See Why/i });
            if (await seeWhyBtn.isVisible({ timeout: 2000 })) {
                console.log(`[${assignmentName}] Banner detected: "PowerGrader may not be able to grade..."`);
                await seeWhyBtn.click();
                console.log(`[${assignmentName}] Clicked "See Why" button.`);

                const gradeAnywayBtn = this.page.getByRole('button', { name: /Grade Anyway/i });
                await gradeAnywayBtn.click();
                console.log(`[${assignmentName}] Clicked "Grade Anyway". Waiting for AI grading...`);
                await this.page.waitForTimeout(5000);
                throw new Error('Waiting for AI grading after Grade Anyway...');
            }

            const startBtn = this.page.locator('button').filter({ hasText: /^Start Reviewing$/i });
            if (await startBtn.isVisible({ timeout: 5000 })) {
                await startBtn.click();
            } else {
                throw new Error('Waiting for "Start Reviewing" button...');
            }
        }).toPass({ timeout: 15 * 60 * 1000, intervals: [interval] });
    }

    /** Wait until grading page data is populated. */
    private async waitUntilGradingPagePopulated(assignmentName: string): Promise<void> {
        await expect(async () => {
            console.log(`[${assignmentName}] Grading Page: Verifying AI results...`);
            try {
                await this.gradingPage.waitForLoad();
                await this.gradingPage.verifyGradesAndFeedbackPopulated();
            } catch (error) {
                await this.page.reload({ waitUntil: 'domcontentloaded' });
                await this.page.waitForTimeout(5000);
                throw error;
            }
        }).toPass({ timeout: 180_000, intervals: [15_000] });
    }
}
