import { expect } from '@playwright/test';
import { test } from '../../fixtures';
import { D2LLMS } from '../../components/lms/d2l/D2LLMS';
import { D2LLMSStudent } from '../../components/lms/d2l/D2LLMSStudent';
import { PowerGrader } from '../../components/powergrader/PowerGrader';
import { getD2LAssignmentConfigs } from '../../test-data/assignments/d2l';
import { C69002, C69065, C69067, C69098 } from '../../test-data/testCaseIds';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getD2LConfig } from '../../config/d2l.config';
import { AllureHelper } from '../../utils/allureHelper';
import { GradingSummary } from '../../types';

async function waitForStudentAssignmentToAppear(
    student: D2LLMSStudent,
    courseName: string,
    assignmentTitle: string,
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
                `[${assignmentTitle}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - navigating to assignments...`
            );
            await student.dashboardPage.goto(student.baseURL);
            await student.dashboardPage.selectCourse(courseName);
            await student.coursePage.clickAssignments();
            await student.assignmentListPage.clickAssignment(assignmentTitle);
            if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69065:'))) {
                AllureHelper.label('caseStatus', `${C69065.split(':')[0]}:reached`);
            }
            if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69067:'))) {
                AllureHelper.label('caseStatus', `${C69067.split(':')[0]}:reached`);
            }
            console.log(`[${assignmentTitle}] Student Sync: assignment is visible to student ✅`);
            return;
        } catch {
            console.log(
                `[${assignmentTitle}] Student Sync: not visible yet... retrying in ${Math.round(intervalMs / 1000)}s`
            );
            await student.page.waitForTimeout(intervalMs);
        }
    }

    throw new Error(`Timed out waiting for student to see assignment: "${assignmentTitle}"`);
}

test.describe('D2L: PowerGrader grade + LMS verify @d2l @component', () => {
    const allConfigs = getD2LAssignmentConfigs();
    const CONFIG_INDEX = 2;
    const assignmentConfig = allConfigs[CONFIG_INDEX];
    if (!assignmentConfig) throw new Error(`No D2L assignment config at index ${CONFIG_INDEX}.`);
    if (!assignmentConfig.submissionType) {
        throw new Error(`Selected config at index ${CONFIG_INDEX} has no submissionType.`);
    }

    const { courseName, credentials } = getD2LConfig();

    test('Create, submit, PG extracts summary + publish, verify LMS', async ({
        d2lTeacherPage,
        d2lStudentPage,
    }) => {
        test.setTimeout(1_200_000);
        AllureHelper.label('lms', 'd2l');
        AllureHelper.label('caseConfig', `d2l|verify-lms|${assignmentConfig.title}`);
        AllureHelper.label('testCaseId', C69065);
        AllureHelper.label('caseStatus', `${C69065.split(':')[0]}:not_reached`);
        AllureHelper.label('testCaseId', C69002);
        if (assignmentConfig.submissionType !== 'Text Entry') {
            AllureHelper.label('testCaseId', C69098);
      AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:not_reached`);
        }
        if (assignmentConfig.submissionType === 'Text Entry') {
            AllureHelper.label('testCaseId', C69067);
            AllureHelper.label('caseStatus', `${C69067.split(':')[0]}:not_reached`);
        }

        const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;
        const teacher = new D2LLMS(d2lTeacherPage.page);
        const student = new D2LLMSStudent(d2lStudentPage.page);
        const submissionType = assignmentConfig.submissionType!;

        console.log(`\n===== D2L PG + LMS verify: ${uniqueTitle} (config index ${CONFIG_INDEX}) =====`);

        let extractedSummary: GradingSummary;

        await AllureHelper.step('1. Create assignment in D2L', async () => {
            await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
        });

        await AllureHelper.step(`2. Submit assignment (${submissionType})`, async () => {
            await waitForStudentAssignmentToAppear(student, courseName, uniqueTitle);
            const commentMeta = { uniqueTitle, studentLabel: credentials.studentUsername };
            if (submissionType === 'Text Entry') {
                await student.verifyFileTypeAndSubmit(
                    uniqueTitle,
                    'Text Entry',
                    undefined,
                    getSubmissionText(),
                    commentMeta
                );
            } else {
                const filePath = getSubmissionFilePath(submissionType as any);
                await student.verifyFileTypeAndSubmit(uniqueTitle, submissionType, filePath, undefined, commentMeta);
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
            await teacher.verifyLmsScore(uniqueTitle, extractedSummary);
        });
    });
});
