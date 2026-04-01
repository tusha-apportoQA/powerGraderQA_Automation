import { Page } from '@playwright/test';
import { CanvasDashboardPage } from './pages/CanvasDashboardPage';
import { CanvasCoursePage } from './pages/CanvasCoursePage';
import { CanvasAssignmentListPage } from './pages/CanvasAssignmentListPage';
import { CanvasAssignmentDetailsPage } from './pages/CanvasAssignmentDetailsPage';
import { CanvasAssignmentSubmissionPage } from './pages/CanvasAssignmentSubmissionPage';
import { FormatType } from '../../../types';
import { getCanvasConfig } from '../../../config/canvas.config';

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
     */
    async verifyFileTypeAndSubmit(
        submissionType: FormatType,
        filePath?: string,
        text?: string
    ): Promise<void> {
        // Verify file type and submit assignment
        await this.assignmentDetailsPage.verifyFileType(submissionType);
        await this.assignmentDetailsPage.clickStartAssignment();
        
        await this.submissionPage.waitForLoad();
        await this.submissionPage.prepareSubmission(submissionType, filePath, text);
        await this.submissionPage.verifySubmissionReady(submissionType);
        
        // Submit the assignment
        await this.submissionPage.submitAssignment();
        
        // Verify submission was successful
        await this.submissionPage.verifySubmissionSuccess();
    }
}
