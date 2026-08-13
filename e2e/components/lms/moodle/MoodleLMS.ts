import { Page, expect } from '@playwright/test';
import { MoodleDashboardPage } from './pages/MoodleDashboardPage';
import { MoodleCoursePage } from './pages/MoodleCoursePage';
import { MoodleAssignmentCreatePage } from './pages/MoodleAssignmentCreatePage';
import { MoodleAssignmentDetailsPage } from './pages/MoodleAssignmentDetailsPage';
import { MoodleAdvancedGradingPage } from './pages/MoodleAdvancedGradingPage';
import { MoodleGradingPage } from './pages/MoodleGradingPage';
import { GradingSummary, LmsTeacher, MoodleAssignmentConfig } from '../../../types';
import { AllureHelper } from '../../../utils/allureHelper';
import { getMoodleConfig } from '../../../config/moodle.config';
import { C69002, C78990 } from '../../../test-data/testCaseIds';
import { PowerGraderCoursePage } from '../../powergrader/pages/PowerGraderCoursePage';
import { getMoodleAssignmentConfigs } from '../../../test-data/assignments/moodle';

function parseEarnedPointsFromTotalScore(totalScore: string): number {
    const s = String(totalScore).trim();
    const slash = s.match(/^([\d.]+)\s*\/\s*[\d.]+/);
    if (slash) return Number(slash[1]);
    const m = s.match(/[\d.]+/);
    return m ? Number(m[0]) : NaN;
}

export class MoodleLMS implements LmsTeacher {
    page: Page;
    baseURL: string;
    dashboardPage: MoodleDashboardPage;
    coursePage: MoodleCoursePage;
    createAssignmentPage: MoodleAssignmentCreatePage;
    assignmentDetailsPage: MoodleAssignmentDetailsPage;
    advancedGradingPage: MoodleAdvancedGradingPage;
    moodleGradingPage: MoodleGradingPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getMoodleConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new MoodleDashboardPage(page);
        this.coursePage = new MoodleCoursePage(page);
        this.createAssignmentPage = new MoodleAssignmentCreatePage(page);
        this.assignmentDetailsPage = new MoodleAssignmentDetailsPage(page);
        this.advancedGradingPage = new MoodleAdvancedGradingPage(page);
        this.moodleGradingPage = new MoodleGradingPage(page);
    }

    async createAssignment(config: MoodleAssignmentConfig): Promise<void> {
        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        const { courseName } = getMoodleConfig();
        const targetCourseName = config.courseName || courseName;
        
        if (!targetCourseName) {
            throw new Error('Course name is required. Set MOODLE_COURSE_NAME in .env or provide courseName in config.');
        }
        
        await this.dashboardPage.selectCourse(targetCourseName);

        await this.coursePage.expectCoursePageLoaded(); 
        
        // Turn on editing mode (required for Moodle)
        await this.coursePage.turnEditingOn();
        
        // Click "Add an activity or resource" button
        await this.coursePage.clickAddActivityOrResource();
        
        // Wait for modal and select Assignment
        await this.coursePage.waitForActivityChooserModal();
        await this.coursePage.selectAssignmentLinkFromModal();
        
        await this.createAssignmentPage.expectAssignmentCreatePageLoaded();
        await this.createAssignmentPage.fillTitle(config.title);
        
        if (config.description) {
            await this.createAssignmentPage.fillDescription(config.description);
        }

         // Set dates if provided
         if (config.assignAccess) {
            if (config.assignAccess.availableFrom) {
                await this.createAssignmentPage.setAllowSubmissionsFromDate(config.assignAccess.availableFrom);
            }
            
            if (config.assignAccess.dueDate) {
                await this.createAssignmentPage.setDueDate(config.assignAccess.dueDate);
            }
            
            if (config.assignAccess.until) {
                await this.createAssignmentPage.setCutOffDate(config.assignAccess.until);
            }
        }

        // Set points/grade if provided
        if (config.points) {
            await this.createAssignmentPage.setPoints(config.points);
        }
        
        // Set grading method to Rubric if rubric is configured
        if (config.rubric && config.rubric.type !== 'no') {
            await this.createAssignmentPage.setGradingMethodToRubric();
        }
        
        // Set submission type if provided
        if (config.submissionType) {
            await this.createAssignmentPage.setSubmissionType(config.submissionType);
        }
        
        // Save and display the assignment
        await this.createAssignmentPage.clickSaveAndDisplay();

        if (config.rubric && config.rubric.type !== 'no') {
            await this.advancedGradingPage.setupRubric(config.rubric);
        }
    }

    /**
     * Navigate to course page (dashboard → select course).
     */
    async navigateToCourse(courseName?: string): Promise<void> {
        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();

        const { courseName: defaultCourseName } = getMoodleConfig();
        const targetCourseName = courseName || defaultCourseName;
        if (!targetCourseName) {
            throw new Error('Course name is required. Set MOODLE_COURSE_NAME in .env or pass courseName.');
        }

        await this.dashboardPage.selectCourse(targetCourseName);
        await this.coursePage.expectCoursePageLoaded();
    }

    /**
     * Navigate to PowerGrader from the course page: click the QA instance link (opens in new tab).
     * Requires MOODLE_POWERGRADER_QA_INSTANCE_NAME in .env (e.g. "amit powergrader QA").
     * @returns The PowerGrader page (new tab).
     */
    async navigateToPowerGrader(): Promise<Page> {
        const { powergraderQaInstanceName } = getMoodleConfig();

        const powergraderLink = this.page.getByRole('link', { name: powergraderQaInstanceName }).first();
        await expect(powergraderLink).toBeVisible({ timeout: 30000 });

        const [newPage] = await Promise.all([
            this.page.context().waitForEvent('page'),
            powergraderLink.click()
        ]);

        await newPage.waitForLoadState('domcontentloaded');
        await expect(
            newPage.getByTestId('assignments-filters-search-input'),
            'PowerGrader QA launch failed: assignments search input not visible',
        ).toBeVisible({ timeout: 120_000 });
        AllureHelper.label('caseStatus', `${C78990.split(':')[0]}:passed`);
        console.log('[MoodleLMS] C78990: PowerGrader QA instance launched (assignments search visible).');
        return newPage;
    }

    /**
     * Opens PowerGrader for this course, builds the automation cleanup title list, then deletes
     * each assignment from the Moodle course page activity list.
     */
    async cleanupAutomationAssignments(): Promise<void> {
        await this.navigateToCourse();
        const powerGraderPage = await this.navigateToPowerGrader();

        const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
        await powerGraderCoursePage.page.waitForLoadState('networkidle', {timeout: 180000});
        await powerGraderPage.waitForTimeout(2000);

        await powerGraderCoursePage.clickSyncNowIfAvailable('[cleanup][moodle]');
        console.log('[cleanup][moodle] Waiting 2 minutes for LMS sync...');
        await powerGraderPage.waitForTimeout(120_000);
        await powerGraderPage.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
        await powerGraderPage.waitForLoadState('networkidle', { timeout: 180_000 }).catch(() => {});

        const moodleAssignmentTitles = getMoodleAssignmentConfigs().map(config => config.title);
        const cleanupTitles = await powerGraderCoursePage.getAutomationCleanupAssignmentTitles(
            moodleAssignmentTitles,
        );
        console.log(`[cleanup][moodle] assignments to delete (${cleanupTitles.length}):`, cleanupTitles);

        await this.coursePage.expectCoursePageLoaded();

        await this.coursePage.deleteAssignmentsByNames(cleanupTitles);
    }

    /**
     * Verifies the LMS score for the configured student ({@link getMoodleConfig}.studentDisplayName) and assignment.
     */
    async verifyLmsScore(
        assignmentName: string,
        gradingSummary: GradingSummary,
        expectedSubmissionComment?: string
    ): Promise<void> {
        try {
            await AllureHelper.step('Verify LMS score', async () => {
                const { studentDisplayName } = getMoodleConfig();
                console.log(`[MoodleLMS] verifyLmsScore for student=${studentDisplayName}, assignment="${assignmentName}"`);
                console.log('[MoodleLMS] Expected GradingSummary:', gradingSummary);

                await AllureHelper.step('Navigate to course page', async () => {
                    await this.navigateToCourse();
                });

                await AllureHelper.step(`Navigate to assignment details page for "${assignmentName}"`, async () => {
                    await this.coursePage.clickAssignment(assignmentName);
                    await this.assignmentDetailsPage.expectAssignmentDetailsLoaded();
                    await this.page.getByRole('link', { name: 'View all submissions' }).click();
                });

                await AllureHelper.step(`Navigate to grading page for student "${studentDisplayName}"`, async () => {
                    const studentRow = this.page.locator('tr').filter({ hasText: studentDisplayName }).first();
                    const gradeButton = studentRow.getByRole('link', { name: 'Grade' });
                    await gradeButton.click();
                    await this.moodleGradingPage.expectMoodleGradingPageLoaded();
                });

                await AllureHelper.attachScreenshot(this.page, 'Checkpoint|LMS grading data loaded');

                await AllureHelper.step('Compare LMS scores with expected', async () => {
                    const lmsSummary = await this.moodleGradingPage.getRubricSnapshot();

                    const expEarned = parseEarnedPointsFromTotalScore(gradingSummary.totalScore);
                    const lmsEarned = parseEarnedPointsFromTotalScore(lmsSummary.totalScore);
                    console.log(
                        `[MoodleLMS] Total earned -> expected=${expEarned} (from "${gradingSummary.totalScore}"), LMS=${lmsEarned} (from "${lmsSummary.totalScore}")`
                    );
                    await expect(lmsEarned).toBe(expEarned);

                    const expectedCriteria = gradingSummary.criteria ?? [];
                    const lmsCriteria = lmsSummary.criteria ?? [];
                    await expect(lmsCriteria.length).toBe(expectedCriteria.length);

                    for (let i = 0; i < expectedCriteria.length; i++) {
                        const expCrit = expectedCriteria[i];
                        const lmsCrit = lmsCriteria[i];
                        if (!lmsCrit) throw new Error(`Criterion at index ${i} missing in LMS`);

                        const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
                        console.log(
                            `[MoodleLMS] Criterion index ${i} -> expected name="${expCrit.name}", LMS name="${lmsCrit.name}"`
                        );
                        await expect(normalize(lmsCrit.name)).toBe(normalize(expCrit.name));

                        const roundedExpectedPoints = Math.ceil(expCrit.points - 0.5);
                        const roundedLmsPoints = Math.ceil(lmsCrit.points - 0.5);
                        console.log(
                            `[MoodleLMS] Criterion index ${i} -> expected points=${expCrit.points} (rounded=${roundedExpectedPoints}), LMS=${lmsCrit.points} (rounded=${roundedLmsPoints})`
                        );
                        await expect(roundedLmsPoints).toBe(roundedExpectedPoints);

                        console.log(`[MoodleLMS] Criterion index ${i} -> comparing feedback`);
                        await expect(lmsCrit.feedback).toBe(expCrit.feedback);
                    }
                });

                if (expectedSubmissionComment) {
                    await AllureHelper.step('Verify submission comment', async () => {
                        try {
                            const found = await this.moodleGradingPage.hasSubmissionCommentVisible(expectedSubmissionComment);
                            if (!found) {
                                console.warn(
                                    `[MoodleLMS] Submission comment not found on grading page (non-blocking). Expected exact: "${expectedSubmissionComment}"`
                                );
                            } else {
                                console.log('[MoodleLMS] Submission comment found on grading page.');
                            }
                        } catch (error) {
                            console.warn('[MoodleLMS] Submission comment check failed (non-blocking):', error);
                        }
                    });
                }

                AllureHelper.label('caseStatus', `${C69002.split(':')[0]}:passed`);
            });
        } catch (error) {
            await AllureHelper.attachFailureDiagnostics(
                this.page,
                'C69002|LMS|Verify LMS score',
                { error: error instanceof Error ? error.message : String(error) },
            );
            throw error;
        }
    }
}

