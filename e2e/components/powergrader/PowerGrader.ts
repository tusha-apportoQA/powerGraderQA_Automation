import { expect, Page } from '@playwright/test';
import { PowerGraderCoursePage } from './pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from './pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from './pages/PowerGraderGradingPage';
import { GradingSummary } from '../../types';

/** PowerGrader facade for grading, summary extraction, and publish. */
export class PowerGrader {
    readonly page: Page;
    readonly coursePage: PowerGraderCoursePage;
    readonly assignmentDetailsPage: PowerGraderAssignmentDetailsPage;
    readonly gradingPage: PowerGraderGradingPage;

    private static readonly POLL_INTERVAL_MS = 30_000;

    constructor(page: Page) {
        this.page = page;
        this.coursePage = new PowerGraderCoursePage(page);
        this.assignmentDetailsPage = new PowerGraderAssignmentDetailsPage(page);
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

    /**
     * Opens a specific student's submission grading page by assignment and student email.
     */
    async openStudentSubmissionForAssignment(assignmentName: string, studentEmail: string): Promise<void> {
        await this.syncCoursePageAndOpenAssignment(assignmentName);
        await this.openStudentSubmissionFromAssignmentDetails(assignmentName, studentEmail);
        await this.gradingPage.waitForLoad();
    }

    /** Open target assignment from course list. */
    private async syncCoursePageAndOpenAssignment(assignmentName: string): Promise<void> {
        const interval = PowerGrader.POLL_INTERVAL_MS;

        await expect(async () => {
            console.log(`[${assignmentName}] Course Page Sync: Checking for assignment...`);
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.coursePage.waitForLoad();
            await this.page.waitForTimeout(2000);

            // Search for the assignment by title
           // const searchInput = this.page.locator('input[placeholder="Search titles..."]');
           const searchInput = this.page.locator('input[placeholder*="Search titles"]');
            //console.log(`[${uniqueTitle}] Looking for search input...`);
            await expect(searchInput).toBeVisible({ timeout: 10000 });
           // console.log(`[${uniqueTitle}] Search input found. Filling with: ${assignmentKey}`);
            await searchInput.clear();
            await searchInput.fill(assignmentName);
            await this.page.waitForTimeout(1000);

            const row = this.page.locator('tr, div[role="row"]').filter({ hasText: assignmentName }).last();
            if (await row.isVisible()) {
                console.log(`[${assignmentName}] Assignment found. Clicking on "View details"...`);
                const viewBtn = row
                    .getByRole('link', { name: 'View details', exact: true })
                    .or(row.getByText('View details', { exact: true }));
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

            const startBtn = this.page.locator('button').filter({ hasText: /^Review$/i });
            if (await startBtn.isVisible({ timeout: 5000 })) {
                await startBtn.click();
            } else {
                throw new Error('Waiting for "Review" button...');
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

    /** From assignment details, open the target student's submission by email. */
    private async openStudentSubmissionFromAssignmentDetails(
        assignmentName: string,
        studentEmail: string
    ): Promise<void> {
        const interval = PowerGrader.POLL_INTERVAL_MS;
        await expect(async () => {
            console.log(
                `[${assignmentName}] Assignment Details Sync: Looking for submission for ${studentEmail}...`
            );
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.assignmentDetailsPage.waitForLoad();
            await this.assignmentDetailsPage.clickViewButtonForStudent(studentEmail);
        }).toPass({ timeout: 600_000, intervals: [interval] });
    }
}
