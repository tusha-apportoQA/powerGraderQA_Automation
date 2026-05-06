import { expect } from '@playwright/test';
import { test } from '../../fixtures';
import { MoodleLMS } from '../../components/lms/moodle/MoodleLMS';
import { MoodleLMSStudent } from '../../components/lms/moodle/MoodleLMSStudent';
import { PowerGrader } from '../../components/powergrader/PowerGrader';
import { getMoodleAssignmentConfigs } from '../../test-data/assignments/moodle';
import { C69002, C69060, C69061, C69098 } from '../../test-data/testCaseIds';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getMoodleConfig } from '../../config/moodle.config';
import { AllureHelper } from '../../utils/allureHelper';
import { GradingSummary } from '../../types';

async function waitForAssignmentToAppearOnCoursePage(
    student: MoodleLMSStudent,
    assignmentTitle: string,
    courseName: string,
    labelForLogs: string,
    opts?: { maxWaitMs?: number; intervalMs?: number }
): Promise<void> {
    const maxWaitMs = opts?.maxWaitMs ?? 8 * 60 * 1000;
    const intervalMs = opts?.intervalMs ?? 15 * 1000;
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < maxWaitMs) {
        attempt += 1;
        const elapsedSec = ((Date.now() - start) / 1000).toFixed(0);
        try {
            console.log(
                `[${labelForLogs}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - checking course page...`
            );
            await student.dashboardPage.goto(student.baseURL);
            await student.dashboardPage.expectDashboardLoaded();
            await student.dashboardPage.selectCourse(courseName);
            await student.coursePage.expectCoursePageLoaded();
            const visible = await student.coursePage.hasAssignmentLink(assignmentTitle);
            if (visible) return;
        } catch {}

        await student.page.waitForTimeout(intervalMs);
    }

    throw new Error(`Timed out waiting for assignment to appear on course page for: "${labelForLogs}"`);
}

test.describe('Moodle: PowerGrader grade + LMS verify @moodle @component', () => {
    const allConfigs = getMoodleAssignmentConfigs();
    const CONFIG_INDEX = 2;
    const assignmentConfig = allConfigs[CONFIG_INDEX];
    if (!assignmentConfig) throw new Error(`No Moodle assignment config at index ${CONFIG_INDEX}.`);
    if (!assignmentConfig.submissionType) {
        throw new Error(`Selected config at index ${CONFIG_INDEX} has no submissionType.`);
    }

    const { studentDisplayName, courseName, credentials } = getMoodleConfig();

    test('Create, submit, PG extracts summary + publish, verify LMS', async ({
        moodleTeacherPage,
        moodleStudentPage,
    }) => {
        test.setTimeout(1_200_000);
        AllureHelper.label('lms', 'moodle');
        AllureHelper.label('caseConfig', `moodle|verify-lms|${assignmentConfig.title}`);
        AllureHelper.label('testCaseId', C69060);
        AllureHelper.label('caseStatus', `${C69060.split(':')[0]}:not_reached`);
        AllureHelper.label('testCaseId', C69061);
        AllureHelper.label('caseStatus', `${C69061.split(':')[0]}:not_reached`);
        AllureHelper.label('testCaseId', C69002);
        if (assignmentConfig.submissionType !== 'Text Entry') {
            AllureHelper.label('testCaseId', C69098);
      AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:not_reached`);
        }

        const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;
        const teacher = new MoodleLMS(moodleTeacherPage.page);
        const student = new MoodleLMSStudent(moodleStudentPage.page);
        const submissionType = assignmentConfig.submissionType!;

        console.log(`\n===== Moodle PG + LMS verify: ${uniqueTitle} (config index ${CONFIG_INDEX}) =====`);

        let extractedSummary: GradingSummary;

        await AllureHelper.step('1. Create assignment in Moodle', async () => {
            await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
        });

        await AllureHelper.step(`2. Submit assignment (${submissionType})`, async () => {
            await waitForAssignmentToAppearOnCoursePage(student, uniqueTitle, courseName, uniqueTitle);
            await student.navigateToAssignmentDetails(uniqueTitle, courseName);
            const commentMeta = { uniqueTitle, studentLabel: credentials.studentUsername };
            if (submissionType === 'Text Entry') {
                await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText(), commentMeta);
            } else {
                const filePath = getSubmissionFilePath(submissionType as any);
                await student.verifyFileTypeAndSubmit(submissionType, filePath, undefined, commentMeta);
            }
        });

        await AllureHelper.step('3. Open PowerGrader, grade, extract summary, publish', async () => {
            await teacher.navigateToCourse();
            const pg = await teacher.navigateToPowerGrader();
            const powerGrader = new PowerGrader(pg);
            extractedSummary = await powerGrader.gradeAssignmentAndExtractSummary(uniqueTitle);
            await AllureHelper.attachJSON('PowerGrader GradingSummary', extractedSummary);
        });

        await AllureHelper.step('4. Verify LMS against extracted summary', async () => {
            await teacher.verifyLmsScore(studentDisplayName, uniqueTitle, extractedSummary);
        });
    });
});
