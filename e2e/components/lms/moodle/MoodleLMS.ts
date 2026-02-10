import { Page, expect } from '@playwright/test';
import { MoodleDashboardPage } from './pages/MoodleDashboardPage';
import { MoodleCoursePage } from './pages/MoodleCoursePage';
import { MoodleAssignmentCreatePage } from './pages/MoodleAssignmentCreatePage';
import { MoodleAssignmentDetailsPage } from './pages/MoodleAssignmentDetailsPage';
import { MoodleAdvancedGradingPage } from './pages/MoodleAdvancedGradingPage';
import { MoodleAssignmentConfig } from '../../../types';
import { getMoodleConfig } from '../../../config/moodle.config';

export class MoodleLMS {
    page: Page;
    baseURL: string;
    dashboardPage: MoodleDashboardPage;
    coursePage: MoodleCoursePage;
    createAssignmentPage: MoodleAssignmentCreatePage;
    assignmentDetailsPage: MoodleAssignmentDetailsPage;
    advancedGradingPage: MoodleAdvancedGradingPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getMoodleConfig();
        this.baseURL = baseURL;
        
        this.dashboardPage = new MoodleDashboardPage(page);
        this.coursePage = new MoodleCoursePage(page);
        this.createAssignmentPage = new MoodleAssignmentCreatePage(page);
        this.assignmentDetailsPage = new MoodleAssignmentDetailsPage(page);
        this.advancedGradingPage = new MoodleAdvancedGradingPage(page);
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
        return newPage;
    }
}

