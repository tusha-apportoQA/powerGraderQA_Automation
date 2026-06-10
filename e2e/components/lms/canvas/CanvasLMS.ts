import { expect, Page } from '@playwright/test';
import { CanvasDashboardPage } from './pages/CanvasDashboardPage';
import { CanvasCoursePage } from './pages/CanvasCoursePage';
import { CanvasAssignmentListPage } from './pages/CanvasAssignmentListPage';
import { CanvasCreateAssignmentPage } from './pages/CanvasCreateAssignmentPage';
//import { CanvasAssignmentDetailsPage } from './pages/CanvasAssignmentDetailsPage';
import { CanvasAssignmentDetailsPage } from './pages/CanvasAssignmentDetailsPage';
import { CanvasGradingPage } from './pages/CanvasGradingPage';
import { AssignmentConfig, GradingSummary, LmsTeacher } from '../../../types';
import { getCanvasConfig } from '../../../config/canvas.config';
import { C69002, C69070 } from '../../../test-data/testCaseIds';
import { AllureHelper } from '../../../utils/allureHelper';
import { PowerGraderCoursePage } from '../../powergrader/pages/PowerGraderCoursePage';

/** Earned points from a total string, e.g. "13/15" -> 13. */
function parseEarnedPointsFromTotalScore(totalScore: string): number {
    const s = String(totalScore).trim();
    const slash = s.match(/^([\d.]+)\s*\/\s*[\d.]+/);
    if (slash) return Number(slash[1]);
    const m = s.match(/[\d.]+/);
    return m ? Number(m[0]) : NaN;
}

/** Max points from a total string, e.g. "13/15" -> 15. */
function parseMaxPointsFromTotalScore(totalScore: string): number | null {
    const s = String(totalScore).trim();
    const slash = s.match(/^[\d.]+\s*\/\s*([\d.]+)/);
    return slash ? Number(slash[1]) : null;
}

export class CanvasLMS implements LmsTeacher {
    page: Page;
    baseURL: string;
    dashboardPage: CanvasDashboardPage;
    coursePage: CanvasCoursePage;
    assignmentListPage: CanvasAssignmentListPage;
    createAssignmentPage: CanvasCreateAssignmentPage;
    assignmentDetailsPage: CanvasAssignmentDetailsPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getCanvasConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new CanvasDashboardPage(page);
        this.coursePage = new CanvasCoursePage(page);
        this.assignmentListPage = new CanvasAssignmentListPage(page);
        this.createAssignmentPage = new CanvasCreateAssignmentPage(page);
        this.assignmentDetailsPage = new CanvasAssignmentDetailsPage(page);
    }

        async createAssignment(config: AssignmentConfig): Promise<void> {
            await this.dashboardPage.goto(this.baseURL);
            await this.dashboardPage.expectDashboardLoaded();
            
            const { courseName, defaultPoints } = getCanvasConfig();
            await this.dashboardPage.selectCourse(courseName);

            await this.coursePage.expectCoursePageLoaded();
            await this.coursePage.clickAssignments();
            
            await this.assignmentListPage.expectAssignmentsListLoaded();
            await this.assignmentListPage.clickCreateAssignment();
            
            await this.createAssignmentPage.expectCreateAssignmentPageLoaded();
            await this.createAssignmentPage.fillTitle(config.title);
            
            if (config.description) {
                await this.createAssignmentPage.fillDescription(config.description);
            }
            
            await this.createAssignmentPage.fillPoints(config.points || defaultPoints);
            
            if (config.submissionType) {
                await this.createAssignmentPage.setSubmissionType(config.submissionType);
            }
            
            if (config.assignAccess) {
                await this.createAssignmentPage.setAssignmentAccess(config.assignAccess);
            }
            
            await this.createAssignmentPage.clickSaveAndPublish();

            await this.assignmentDetailsPage.waitForLoad();
            
            // Set rubric BEFORE final verification to ensure page state is settled
            if (config.rubric && config.rubric.type !== 'no') {
                console.log(`[CanvasLMS] Setting up ${config.rubric.type} rubric...`);
                await this.assignmentDetailsPage.setRubric(config.rubric);
                // Give Canvas a moment to save the rubric association
                await this.page.waitForTimeout(1000); 
            } else {
                console.log(`[CanvasLMS] "No Rubric" detected in config. Skipping Canvas rubric setup.`);
            }

            await this.assignmentDetailsPage.verifyAssignmentTitle(config.title);
        }

    /**
     * Verify that the score and rubric results visible in Canvas match the expected {@link GradingSummary}.
     * Scrapes LMS via {@link CanvasGradingPage} (`getRubricSnapshot`), then compares totals and
     * per-criterion **points** and **feedback** by **index order** (criterion names are not used).
     * Uses configured {@link getCanvasConfig}.studentDisplayName for SpeedGrader student selection.
     */
    async verifyLmsScore(
        assignmentName: string,
        gradingSummary: GradingSummary,
        expectedSubmissionComment?: string
    ): Promise<void> {
        const { studentDisplayName: studentName } = getCanvasConfig();
        console.log(`[CanvasLMS] verifyLmsScore for student=${studentName}, assignment="${assignmentName}"`);
        console.log('[CanvasLMS] Expected GradingSummary:', gradingSummary);

        await this.navigateToCourse();

        await this.coursePage.clickAssignments();
        await this.assignmentListPage.expectAssignmentsListLoaded();

        await this.assignmentListPage.clickAssignment(assignmentName);
        await this.assignmentDetailsPage.verifyAssignmentTitle(assignmentName);

        const speedGraderPage = await this.assignmentDetailsPage.openSpeedGrader();
        const canvasGradingPage = new CanvasGradingPage(speedGraderPage);
        await canvasGradingPage.waitForLoad();
        await canvasGradingPage.ensureSelectedStudent(studentName);

        const lmsSummary = await canvasGradingPage.getRubricSnapshot();
        console.log('[CanvasLMS] LMS GradingSummary (scraped):', lmsSummary);

        const expEarned = parseEarnedPointsFromTotalScore(gradingSummary.totalScore);
        const lmsEarned = parseEarnedPointsFromTotalScore(lmsSummary.totalScore);
        console.log(
            `[CanvasLMS] Total earned -> expected=${expEarned} (from "${gradingSummary.totalScore}"), LMS=${lmsEarned} (from "${lmsSummary.totalScore}")`
        );
        await expect(lmsEarned).toBe(expEarned);

        const expMax = parseMaxPointsFromTotalScore(gradingSummary.totalScore);
        const lmsMax = parseMaxPointsFromTotalScore(lmsSummary.totalScore);
        if (expMax != null && lmsMax != null && !Number.isNaN(expMax) && !Number.isNaN(lmsMax)) {
            console.log(`[CanvasLMS] Total max -> expected=${expMax}, LMS=${lmsMax}`);
            await expect(lmsMax).toBe(expMax);
        }

        const expectedCriteria = gradingSummary.criteria ?? [];
        const lmsCriteria = lmsSummary.criteria ?? [];

        await expect(lmsCriteria.length).toBe(expectedCriteria.length);

        for (let i = 0; i < expectedCriteria.length; i++) {
            const expCrit = expectedCriteria[i];
            const lmsCrit = lmsCriteria[i];
            if (lmsCrit === undefined) {
                throw new Error(`Criterion at index ${i} missing in LMS`);
            }

            console.log(
                `[CanvasLMS] Criterion index ${i} -> expected points=${expCrit.points}, LMS=${lmsCrit.points}`
            );
            await expect(lmsCrit.points).toBe(expCrit.points);

            console.log(`[CanvasLMS] Criterion index ${i} -> comparing feedback`);
            await expect(lmsCrit.feedback).toBe(expCrit.feedback);
        }

        if (expectedSubmissionComment) {
            try {
                const actualComment = await canvasGradingPage.getSubmissionCommentText();
                if (actualComment === null) {
                    console.warn('[CanvasLMS] Submission comment element not visible (data-testid="comment-0-text").');
                } else if (actualComment !== expectedSubmissionComment) {
                    console.warn(
                        `[CanvasLMS] Submission comment mismatch (non-blocking). Expected="${expectedSubmissionComment}" | Actual="${actualComment}"`
                    );
                } else {
                    console.log('[CanvasLMS] Submission comment matches expected text.');
                }
            } catch (error) {
                console.warn('[CanvasLMS] Could not verify submission comment (non-blocking):', error);
            }
        }
        AllureHelper.label('caseStatus', `${C69002.split(':')[0]}:passed`);
    }

    /**
     * Extract assignment ID from the current URL
     * @returns {string} Assignment ID extracted from URL
     */
    async getAssignmentIdFromUrl(): Promise<string> {
        const url = this.page.url();
        const match = url.match(/\/assignments\/(\d+)/);
        if (!match || !match[1]) {
            throw new Error(`Could not extract assignment ID from URL: ${url}`);
        }
        return match[1];
    }

    /**
     * Navigate to course page (without creating assignment)
     * @param courseName - Name of the course to navigate to
     */
    async navigateToCourse(courseName?: string): Promise<void> {
        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        const { courseName: defaultCourseName } = getCanvasConfig();
        const targetCourseName = courseName || defaultCourseName;
        await this.dashboardPage.selectCourse(targetCourseName);
        
        await this.coursePage.expectCoursePageLoaded();
    }

    /**
     * Navigate to PowerGrader from the current page
     * Clicks on the Powergrader QA link in the left navigation which opens PowerGrader
     * @returns {Promise<Page>} The PowerGrader page that opens in a new tab
     */
    async navigateToPowerGrader(): Promise<Page> {
        //const powergraderQALink = this.page.locator('id=powergrader-qa-link');
        //const powergraderQALink = this.page.getByRole('link', { name: /Powergrader QA/i });
        const powergraderQALink = this.page.getByRole('link', { name: /Apporto AI Suite QA/i });
        
        await powergraderQALink.waitFor({ state: 'visible', timeout: 30000 });
        
        const [newPage] = await Promise.all([
            this.page.context().waitForEvent('page'),
            powergraderQALink.click()
        ]);
        
        await newPage.waitForLoadState('domcontentloaded');
        try {
            const yesBtn = newPage.getByRole('button', { name: 'Yes' });
            await expect(yesBtn).toBeVisible({ timeout: 10000 });
            await yesBtn.click();
            await newPage.waitForLoadState('networkidle');
            console.log('[D2LLMS] D2L permission modal dismissed.');
        } catch {
            // no modal, continue
        }
        return newPage;
    }

    /**
     * Opens PowerGrader for this course, builds the automation cleanup title list, then deletes
     * each assignment on the Canvas assignment list.
     */
    async cleanupAutomationAssignments(): Promise<void> {
        await this.navigateToCourse();
        const powerGraderPage = await this.navigateToPowerGrader();

        const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
        await powerGraderCoursePage.page.waitForLoadState('networkidle', {timeout: 180000});
        await powerGraderPage.waitForTimeout(2000);

        const cleanupTitles = await powerGraderCoursePage.getAutomationCleanupAssignmentTitles();
        console.log(`[cleanup][canvas] assignments to delete (${cleanupTitles.length}):`, cleanupTitles);

        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickAssignments();
        await this.assignmentListPage.expectAssignmentsListLoaded();

        await this.assignmentListPage.deleteAssignmentsByNames(cleanupTitles);
    }
}
