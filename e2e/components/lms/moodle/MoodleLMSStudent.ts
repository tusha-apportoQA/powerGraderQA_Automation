import { Page, test } from '@playwright/test';
import { MoodleDashboardPage } from './pages/MoodleDashboardPage';
import { MoodleCoursePage } from './pages/MoodleCoursePage';
import { MoodleAssignmentDetailsPage } from './pages/MoodleAssignmentDetailsPage';
import { MoodleAssignmentSubmissionPage } from './pages/MoodleAssignmentSubmissionPage';
import { FormatType } from '../../../types';
import { getMoodleConfig } from '../../../config/moodle.config';
import { AllureHelper } from '../../../utils/allureHelper';
import { C69060, C69061, C69098 } from '../../../test-data/testCaseIds';

export class MoodleLMSStudent {
    page: Page;
    baseURL: string;
    dashboardPage: MoodleDashboardPage;
    coursePage: MoodleCoursePage;
    assignmentDetailsPage: MoodleAssignmentDetailsPage;
    submissionPage: MoodleAssignmentSubmissionPage;

    constructor(page: Page) {
        this.page = page;
        const { baseURL } = getMoodleConfig();
        this.baseURL = baseURL;

        this.dashboardPage = new MoodleDashboardPage(page);
        this.coursePage = new MoodleCoursePage(page);
        this.assignmentDetailsPage = new MoodleAssignmentDetailsPage(page);
        this.submissionPage = new MoodleAssignmentSubmissionPage(page);
    }

    /**
     * Navigate to the assignment details page: dashboard → select course → click assignment by name.
     */
    async navigateToAssignmentDetails(assignmentName: string, courseName: string): Promise<void> {
        if (!courseName) {
            throw new Error('Course name is required');
        }

        await this.dashboardPage.goto(this.baseURL);
        await this.dashboardPage.expectDashboardLoaded();

        await this.dashboardPage.selectCourse(courseName);

        await this.coursePage.expectCoursePageLoaded();
        await this.coursePage.clickAssignment(assignmentName);

        await this.assignmentDetailsPage.waitForLoad();
        await this.assignmentDetailsPage.expectAssignmentDetailsLoaded();
        await this.assignmentDetailsPage.verifyAssignmentTitle(assignmentName);
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69060:'))) {
            AllureHelper.label('caseStatus', `${C69060.split(':')[0]}:reached`);
        }
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69061:'))) {
            AllureHelper.label('caseStatus', `${C69061.split(':')[0]}:reached`);
        }
    }

    /**
     * From assignment details page: click "Add submission", then on edit submission page upload a file.
     * Call after navigateToAssignmentDetails (or when already on assignment details view).
     */
    async addSubmissionAndUploadFile(filePath: string): Promise<void> {
        await this.assignmentDetailsPage.clickAddSubmission();
        await this.submissionPage.waitForLoad();
        await this.submissionPage.uploadFile(filePath);
    }

    /**
     * Verify submission type, go to edit submission page, and prepare submission (mirrors Canvas verifyFileTypeAndSubmit).
     * File types (.docx, .pdf, .txt): require filePath, upload via file manager.
     * Text Entry: optional text param; inner logic left blank for now.
     *
     * @param submissionCommentMeta - Optional (verify-LMS). Posts assignment comment on details page **before** Add submission (non-blocking).
     */
    async verifyFileTypeAndSubmit(
        submissionType: FormatType,
        filePath?: string,
        text?: string,
        submissionCommentMeta?: { uniqueTitle: string; studentLabel: string }
    ): Promise<void> {
        if (submissionCommentMeta) {
            if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69098:'))) {
                AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:reached`);
            }
            try {
                const comment = `submission for ${submissionCommentMeta.uniqueTitle} by ${submissionCommentMeta.studentLabel}`;
                await this.assignmentDetailsPage.expandCommentsAndPostComment(comment);
                if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69098:'))) {
                    AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:passed`);
                }
            } catch (error) {
                console.warn('[MoodleLMSStudent] Assignment comment step failed — continuing without it (non-blocking):', error);
            }
        }
        await this.assignmentDetailsPage.clickAddSubmission();
        await this.submissionPage.waitForLoad();
        await this.submissionPage.prepareSubmission(submissionType, filePath, text);
        await this.submissionPage.clickSaveChanges();
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69060:'))) {
            AllureHelper.label('caseStatus', `${C69060.split(':')[0]}:passed`);
        }
        if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69061:'))) {
            AllureHelper.label('caseStatus', `${C69061.split(':')[0]}:passed`);
        }
    }
}
