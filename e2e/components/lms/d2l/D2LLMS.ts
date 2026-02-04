import { Page } from '@playwright/test';
import { D2LDashboardPage } from './pages/D2LDashboardPage';
import { D2LCoursePage } from './pages/D2LCoursePage';
import { D2LAssignmentListPage } from './pages/D2LAssignmentListPage';
import { D2LAssignmentCreatePage } from './pages/D2LAssignmentCreatePage';
import { D2LAssignmentConfig } from '../../../types';
import { getD2LConfig } from '../../../config/d2l.config';

export class D2LLMS {
    page: Page;
    baseURL: string;
    dashboardPage: D2LDashboardPage;
    coursePage: D2LCoursePage;
    assignmentListPage: D2LAssignmentListPage;
    createAssignmentPage: D2LAssignmentCreatePage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getD2LConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new D2LDashboardPage(page);
        this.coursePage = new D2LCoursePage(page);
        this.assignmentListPage = new D2LAssignmentListPage(page);
        this.createAssignmentPage = new D2LAssignmentCreatePage(page);
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

    async navigateToPowerGrader(): Promise<Page> {
        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickContent();
        return await this.coursePage.clickPowerGraderQATool();
    }
}

