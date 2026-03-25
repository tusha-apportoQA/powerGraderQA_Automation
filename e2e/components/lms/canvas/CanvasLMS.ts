import { Page } from '@playwright/test';
import { CanvasDashboardPage } from './pages/CanvasDashboardPage';
import { CanvasCoursePage } from './pages/CanvasCoursePage';
import { CanvasAssignmentListPage } from './pages/CanvasAssignmentListPage';
import { CanvasCreateAssignmentPage } from './pages/CanvasCreateAssignmentPage';
//import { CanvasAssignmentDetailsPage } from './pages/CanvasAssignmentDetailsPage';
import { CanvasAssignmentDetailsPage } from './pages/CanvasAssignmentDetailsPage';
import { AssignmentConfig } from '../../../types';
import { getCanvasConfig } from '../../../config/canvas.config';

export class CanvasLMS {
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

            await this.assignmentDetailsPage.expectAssignmentDetailsLoaded();
            await this.assignmentDetailsPage.verifyAssignmentTitle(config.title);
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
        const powergraderQALink = this.page.getByRole('link', { name: /Powergrader QA/i });
        
        await powergraderQALink.waitFor({ state: 'visible', timeout: 30000 });
        
        const [newPage] = await Promise.all([
            this.page.context().waitForEvent('page'),
            powergraderQALink.click()
        ]);
        
        await newPage.waitForLoadState('domcontentloaded');
        return newPage;
    }
}
