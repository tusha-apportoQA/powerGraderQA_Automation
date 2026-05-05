import { Page, test } from '@playwright/test';
import { D2LDashboardPage } from './pages/D2LDashboardPage';
import { D2LCoursePage } from './pages/D2LCoursePage';
import { D2LAssignmentListPage } from './pages/D2LAssignmentListPage';
import { D2LAssignmentCreatePage } from './pages/D2LAssignmentCreatePage';
import { D2LAssignmentDetailsPage } from './pages/D2LAssignmentDetailsPage';
import { D2LGradingPage } from './pages/D2LGradingPage';
import { D2LAssignmentConfig, GradingSummary } from '../../../types';
import { getD2LConfig } from '../../../config/d2l.config';
import { expect } from '@playwright/test';
import { C69002, C69065, C69067, C69098 } from '../../../test-data/testCaseIds';
import { AllureHelper } from '../../../utils/allureHelper';

function parseEarnedPointsFromTotalScore(totalScore: string): number {
    const s = String(totalScore).trim();
    const slash = s.match(/^([\d.]+)\s*\/\s*[\d.]+/);
    if (slash) return Number(slash[1]);
    const m = s.match(/[\d.]+/);
    return m ? Number(m[0]) : NaN;
}

export class D2LLMS {
    page: Page;
    baseURL: string;
    dashboardPage: D2LDashboardPage;
    coursePage: D2LCoursePage;
    assignmentListPage: D2LAssignmentListPage;
    createAssignmentPage: D2LAssignmentCreatePage;
    assignmentDetailsPage: D2LAssignmentDetailsPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getD2LConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new D2LDashboardPage(page);
        this.coursePage = new D2LCoursePage(page);
        this.assignmentListPage = new D2LAssignmentListPage(page);
        this.createAssignmentPage = new D2LAssignmentCreatePage(page);
        this.assignmentDetailsPage = new D2LAssignmentDetailsPage(page);
    }

    async createAssignment(config: D2LAssignmentConfig): Promise<void> {
        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        const { courseName } = getD2LConfig();
        const targetCourseName = config.courseName || courseName;
        
        if (!targetCourseName) {
            throw new Error('Course name is required. Set D2L_COURSE_NAME in .env or provide courseName in config.');
        }
        
        await this.dashboardPage.selectCourse(targetCourseName);

        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickAssignments();
        
        await this.assignmentListPage.expectAssignmentListPageLoaded();
        await this.assignmentListPage.clickNewAssignment();
        
        await this.createAssignmentPage.expectCreatePageLoaded();
        await this.createAssignmentPage.fillTitle(config.title);
        
        if (config.description) {
            await this.createAssignmentPage.fillInstructions(config.description);
        }
        
        if (config.points !== undefined) {
            await this.createAssignmentPage.setPoints(config.points);
        }
        
        if (config.assignAccess) {
            if (config.assignAccess.dueDate) {
                const dueDateOnly = config.assignAccess.dueDate.split(' ')[0]; // "MM/DD/YYYY HH:mm" -> "MM/DD/YYYY"
                await this.createAssignmentPage.setDueDate(dueDateOnly);
            }
            
            if (config.assignAccess.availableFrom) {
                const startDateOnly = config.assignAccess.availableFrom.split(' ')[0];
                await this.createAssignmentPage.setStartDate(startDateOnly);
            }
            
            if (config.assignAccess.until) {
                const endDateOnly = config.assignAccess.until.split(' ')[0];
                await this.createAssignmentPage.setEndDate(endDateOnly);
            }
        }
        
        if (config.submissionType) {
            await this.createAssignmentPage.setSubmissionType(config.submissionType);
        }
        
        if (config.rubric) {
            await this.createAssignmentPage.setRubric(config.rubric);
        }
        
        await this.createAssignmentPage.clickSave();
        await this.assignmentListPage.expectAssignmentListPageLoaded();
    }

    async getAssignmentIdFromUrl(): Promise<string> {
        const url = this.page.url();
        const match = url.match(/folderId=(\d+)/);
        if (!match || !match[1]) {
            throw new Error(`Could not extract assignment ID from URL: ${url}`);
        }
        return match[1];
    }

    async navigateToCourse(courseName?: string): Promise<void> {
        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        const { courseName: defaultCourseName } = getD2LConfig();
        const targetCourseName = courseName || defaultCourseName;
        
        if (!targetCourseName) {
            throw new Error('Course name is required. Set D2L_COURSE_NAME in .env or provide courseName parameter.');
        }
        
        await this.dashboardPage.selectCourse(targetCourseName);
        
        await this.coursePage.expectCoursePageLoaded();
    }

    async verifyLmsScore(
        studentDisplayName: string,
        assignmentName: string,
        gradingSummary: GradingSummary,
        expectedSubmissionComment?: string
    ): Promise<void> {
        console.log(`[D2LLMS] verifyLmsScore for student=${studentDisplayName}, assignment="${assignmentName}"`);
        console.log('[D2LLMS] Expected GradingSummary:', gradingSummary);

        await this.navigateToCourse();

        await this.coursePage.clickAssignments();
        await this.assignmentListPage.expectAssignmentListPageLoaded();

        await this.assignmentListPage.clickAssignment(assignmentName);
        await this.assignmentDetailsPage.waitForLoad();
        await this.assignmentDetailsPage.verifyAssignmentTitle(assignmentName);

        // Open evaluation for the specific student on the submissions list
        await this.assignmentDetailsPage.openEvaluationForStudent(studentDisplayName);
        AllureHelper.label('caseStatus', `${C69065.split(':')[0]}:passed`);
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69067:'))) {
            AllureHelper.label('caseStatus', `${C69067.split(':')[0]}:passed`);
        }

        const gradingPage = new D2LGradingPage(this.page);
        const lmsSummary = await gradingPage.getRubricSnapshot();

        const expEarned = parseEarnedPointsFromTotalScore(gradingSummary.totalScore);
        const lmsEarned = parseEarnedPointsFromTotalScore(lmsSummary.totalScore);
        console.log(
            `[D2LLMS] Total earned -> expected=${expEarned} (from "${gradingSummary.totalScore}"), LMS=${lmsEarned} (from "${lmsSummary.totalScore}")`
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
                `[D2LLMS] Criterion index ${i} -> expected name="${expCrit.name}", LMS name="${lmsCrit.name}"`
            );
            await expect(normalize(lmsCrit.name)).toBe(normalize(expCrit.name));

            console.log(
                `[D2LLMS] Criterion index ${i} -> expected points=${expCrit.points}, LMS=${lmsCrit.points}`
            );
            await expect(lmsCrit.points).toBe(expCrit.points);

            console.log(`[D2LLMS] Criterion index ${i} -> comparing feedback`);
            await expect(lmsCrit.feedback).toBe(expCrit.feedback);
        }

        if (expectedSubmissionComment) {
            try {
                const found = await gradingPage.hasVisibleExactText(expectedSubmissionComment);
                if (!found) {
                    console.warn(
                        `[D2LLMS] Submission comment not found on grading page (non-blocking). Expected exact: "${expectedSubmissionComment}"`
                    );
                } else {
                    console.log('[D2LLMS] Submission comment found on grading page.');
                    if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69098:'))) {
                        AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:passed`);
                    }
                }
            } catch (error) {
                console.warn('[D2LLMS] Submission comment check failed (non-blocking):', error);
            }
        }

        AllureHelper.label('caseStatus', `${C69002.split(':')[0]}:passed`);
    }

    /*async navigateToPowerGrader(): Promise<Page> {
        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickContent();
        return await this.coursePage.clickPowerGraderQATool();
    }*/

    //Update by Tusha
    async navigateToPowerGrader(): Promise<Page> {
        // Ensure we are on the course page
        await this.coursePage.expectCoursePageLoaded();
        
        // Click 'Content' to see the tool link
        await this.coursePage.clickContent();

        // CRITICAL CHANGE: Setup the listener BEFORE clicking
        // D2L launches the tool in a new tab. We must 'catch' that tab.
        const [pgPage] = await Promise.all([
            this.page.context().waitForEvent('page'), // Listens for the new tab
            this.coursePage.clickPowerGraderQATool()   // Triggers the launch
        ]);

        // Wait for the PowerGrader UI to actually load
        await pgPage.waitForLoadState('networkidle');
        
        // Return the NEW page object
        return pgPage; 
    }
}

