import { Page, test } from '@playwright/test';
import { CanvasDashboardPage } from './pages/CanvasDashboardPage';
import { CanvasCoursePage } from './pages/CanvasCoursePage';
import { CanvasAssignmentListPage } from './pages/CanvasAssignmentListPage';
import { CanvasAssignmentDetailsPage } from './pages/CanvasAssignmentDetailsPage';
import { CanvasAssignmentSubmissionPage } from './pages/CanvasAssignmentSubmissionPage';
import { FormatType } from '../../../types';
import { getCanvasConfig } from '../../../config/canvas.config';
import { AllureHelper } from '../../../utils/allureHelper';
import { POW910, POW922 } from '../../../test-data/testCaseIds';

export class CanvasLMSStudent {
    page: Page;
    baseURL: string;
    dashboardPage: CanvasDashboardPage;
    coursePage: CanvasCoursePage;
    assignmentListPage: CanvasAssignmentListPage;
    assignmentDetailsPage: CanvasAssignmentDetailsPage;
    submissionPage: CanvasAssignmentSubmissionPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getCanvasConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new CanvasDashboardPage(page);
        this.coursePage = new CanvasCoursePage(page);
        this.assignmentListPage = new CanvasAssignmentListPage(page);
        this.assignmentDetailsPage = new CanvasAssignmentDetailsPage(page);
        this.submissionPage = new CanvasAssignmentSubmissionPage(page);
    }

    async navigateToAssignmentDetails(assignmentName: string, courseName: string): Promise<void> {
        if (!courseName) {
            throw new Error('Course name is required');
        }

        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        await this.dashboardPage.selectCourse(courseName);

        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickAssignments();
        
        await this.assignmentListPage.expectAssignmentsListLoaded();
        await this.assignmentListPage.clickAssignment(assignmentName);
        
        await this.assignmentDetailsPage.waitForLoad();
        await this.assignmentDetailsPage.verifyAssignmentTitle(assignmentName);
    }

    /**
     * Verify file type, prepare submission, submit, and verify submission success
     * @param submissionType - Expected submission type from assignment config
     * @param filePath - Path to file (required for file types)
     * @param text - Text content (required for Text Entry)
     * @param submissionCommentMeta - Optional; when set, fills
     *   "Comments..." with `submission for {uniqueTitle} by {studentLabel}` (non-blocking).
     */
    async verifyFileTypeAndSubmit(
        submissionType: FormatType,
        filePath?: string,
        text?: string,
        submissionCommentMeta?: { uniqueTitle: string; studentLabel: string }
    ): Promise<void> {
        await this.assignmentDetailsPage.clickStartAssignment();
        
        await this.submissionPage.waitForLoad();
        await this.submissionPage.prepareSubmission(submissionType, filePath, text);
        if (submissionCommentMeta) {
            if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('POW-922:'))) {
                AllureHelper.label('caseStatus', `${POW922.split(':')[0]}:reached`);
            }
            try {
                const comment = `submission for ${submissionCommentMeta.uniqueTitle} by ${submissionCommentMeta.studentLabel}`;
                await this.submissionPage.fillComment(comment);
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('POW-922:'))) {
                    AllureHelper.label('caseStatus', `${POW922.split(':')[0]}:passed`);
                }
            } catch (error) {
                console.warn('[CanvasLMSStudent] Submission comment step failed — continuing without it (non-blocking):', error);
            }
        }
        await this.submissionPage.verifySubmissionReady(submissionType);
        
        // Submit the assignment
        await this.submissionPage.submitAssignment();
        
        // Verify submission was successful
        await this.submissionPage.verifySubmissionSuccess();
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('POW-910:'))) {
            AllureHelper.label('caseStatus', `${POW910.split(':')[0]}:passed`);
        }
    }
}
