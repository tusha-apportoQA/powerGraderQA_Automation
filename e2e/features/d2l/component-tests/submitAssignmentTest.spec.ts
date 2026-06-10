/**
 * D2L Component Test: Submit Assignment
 *
 * This test submits assignments in D2L using sample configs with index-based selection.
 * Similar to Canvas submitAssignment flow, it uses the D2LLMSStudent POM to handle the full flow.
 */

import { test, D2LStudentPage } from '../setup';
import { D2LLMSStudent } from '../../../components/lms/d2l/D2LLMSStudent';
import { getD2LAssignmentConfigs } from '../../../test-data/assignments/d2l';
import { getSubmissionFilePath, getSubmissionText } from '../../../test-data/submissions';
import { getD2LConfig } from '../../../config/d2l.config';

type TestFixtures = { 
    d2lStudentPage: D2LStudentPage;
};

test.use({ headless: false });

test.describe('D2L Component Test: Submit Assignment', () => {
    const allConfigs = getD2LAssignmentConfigs();
    const assignmentIndex = 11;

    test('Submit assignment from sample configs', async ({ d2lStudentPage }: TestFixtures) => {
        test.setTimeout(300000);
        
        if (assignmentIndex < 0 || assignmentIndex >= allConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${allConfigs.length - 1}`);
        }

        const config = allConfigs[assignmentIndex];
        if (!config || !config.submissionType) {
            throw new Error(`Assignment config not found at index ${assignmentIndex} or missing submissionType`);
        }

        const studentLms = new D2LLMSStudent(d2lStudentPage.page);
        const { courseName } = getD2LConfig();

        await studentLms.dashboardPage.goto(studentLms.baseURL);
        await studentLms.dashboardPage.expectDashboardLoaded();
        await studentLms.dashboardPage.selectCourse(courseName);
        await studentLms.coursePage.expectCoursePageLoaded();
        await studentLms.coursePage.clickAssignments();
        await studentLms.assignmentListPage.expectAssignmentListPageLoaded();
        await studentLms.assignmentListPage.clickAssignment(config.title);

        if (config.submissionType === 'Text Entry') {
            const submissionText = getSubmissionText();
            await studentLms.verifyFileTypeAndSubmit(config.title, config.submissionType, undefined, submissionText);
        } else if (config.submissionType) {
            const filePath = getSubmissionFilePath(config.submissionFile);
            await studentLms.verifyFileTypeAndSubmit(config.title, config.submissionType, filePath);
        }
    });
});

