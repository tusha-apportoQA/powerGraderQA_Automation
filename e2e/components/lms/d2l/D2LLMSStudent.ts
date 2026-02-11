import { Page } from '@playwright/test';
import { D2LDashboardPage } from './pages/D2LDashboardPage';
import { D2LCoursePage } from './pages/D2LCoursePage';
import { D2LAssignmentListPage } from './pages/D2LAssignmentListPage';
import { D2LAssignmentDetailsPage } from './pages/D2LAssignmentDetailsPage';
import { D2LAssignmentSubmissionPage } from './pages/D2LAssignmentSubmissionPage';
import { FormatType } from '../../../types';
import { getD2LConfig } from '../../../config/d2l.config';

export class D2LLMSStudent {
    page: Page;
    baseURL: string;
    dashboardPage: D2LDashboardPage;
    coursePage: D2LCoursePage;
    assignmentListPage: D2LAssignmentListPage;
    assignmentDetailsPage: D2LAssignmentDetailsPage;
    submissionPage: D2LAssignmentSubmissionPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getD2LConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new D2LDashboardPage(page);
        this.coursePage = new D2LCoursePage(page);
        this.assignmentListPage = new D2LAssignmentListPage(page);
        this.assignmentDetailsPage = new D2LAssignmentDetailsPage(page);
        this.submissionPage = new D2LAssignmentSubmissionPage(page);
    }

    async navigateToAssignmentList(courseName?: string): Promise<void> {
        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        const { courseName: defaultCourseName } = getD2LConfig();
        const targetCourseName = courseName || defaultCourseName;
        
        if (!targetCourseName) {
            throw new Error('Course name is required. Set D2L_COURSE_NAME in .env or provide courseName parameter.');
        }
        
        await this.dashboardPage.selectCourse(targetCourseName);
        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickAssignments();
        await this.assignmentListPage.expectAssignmentListPageLoaded();
    }

    async navigateToAssignmentDetails(assignmentName: string, courseName?: string): Promise<void> {
        const { courseName: defaultCourseName } = getD2LConfig();
        const targetCourseName = courseName || defaultCourseName;
        
        if (!targetCourseName) {
            throw new Error('Course name is required. Set D2L_COURSE_NAME in .env or provide courseName parameter.');
        }

        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();
        
        await this.dashboardPage.selectCourse(targetCourseName);
        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickAssignments();
        
        await this.assignmentListPage.expectAssignmentListPageLoaded();
        await this.assignmentListPage.clickAssignment(assignmentName);
        
        await this.assignmentDetailsPage.waitForLoad();
        await this.assignmentDetailsPage.expectAssignmentDetailsLoaded();
        await this.assignmentDetailsPage.verifyAssignmentTitle(assignmentName);
    }

    async verifyFileTypeAndSubmit(
        assignmentTitle: string,
        submissionType: FormatType,
        filePath?: string,
        text?: string
    ): Promise<void> {
        await this.submissionPage.waitForLoad();
        
        await this.submissionPage.verifyAssignmentName(assignmentTitle);
        
        await this.submissionPage.prepareSubmission(submissionType, filePath, text);
        await this.submissionPage.verifySubmissionReady(submissionType);
        
        await this.submissionPage.submitAssignment();
        
        await this.submissionPage.verifySubmissionSuccess();
    }
}

