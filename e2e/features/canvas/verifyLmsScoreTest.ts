import { expect } from '@playwright/test';
import { test } from '../../fixtures';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { PowerGrader } from '../../components/powergrader/PowerGrader';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { C69002, C69070, C69098 } from '../../test-data/testCaseIds';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import { AllureHelper } from '../../utils/allureHelper';
import { GradingSummary } from '../../types';

/**
 * Poll until the student can open the assignment details page by direct URL.
 * (Same pattern as canvas-orchestration.spec.ts.)
 */
async function waitForStudentAssignmentToAppearByUrl(
  student: CanvasLMSStudent,
  courseId: string,
  assignmentId: string,
  labelForLogs: string,
  opts?: { maxWaitMs?: number; intervalMs?: number }
): Promise<void> {
  const maxWaitMs = opts?.maxWaitMs ?? 8 * 60 * 1000;
  const intervalMs = opts?.intervalMs ?? 15 * 1000;
  const start = Date.now();
  let attempt = 0;

  const url = `${student.baseURL}/courses/${courseId}/assignments/${assignmentId}`;

  while (Date.now() - start < maxWaitMs) {
    attempt += 1;
    const elapsedSec = ((Date.now() - start) / 1000).toFixed(0);

    try {
      console.log(
        `[${labelForLogs}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - opening assignment URL...`
      );
      await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.expectDashboardLoaded();

      await student.page.goto(url, { waitUntil: 'domcontentloaded' });
      await student.assignmentDetailsPage.waitForLoad();
      if (test.info().annotations.some(a => a.type === 'testCaseId' && a.description?.startsWith('C69070:'))) {
        AllureHelper.label('caseStatus', `${C69070.split(':')[0]}:reached`);
      }

      console.log(`[${labelForLogs}] Student Sync: assignment page opened ✅`);
      return;
    } catch {
      console.log(
        `[${labelForLogs}] Student Sync: not accessible yet... retrying in ${Math.round(intervalMs / 1000)}s`
      );
      await student.page.waitForTimeout(intervalMs);
    }
  }
  throw new Error(`Timed out waiting for student to access assignment page for: "${labelForLogs}"`);
}

function parseCourseAndAssignmentIdsFromUrl(url: string): { courseId: string; assignmentId: string } {
  const match = url.match(/\/courses\/(\d+)\/assignments\/(\d+)/);
  if (!match) throw new Error(`Could not parse courseId/assignmentId from URL: ${url}`);
  return { courseId: match[1], assignmentId: match[2] };
}

test.describe('Canvas: PowerGrader grade + LMS verify @canvas @component', () => {
  const allConfigs = getCanvasAssignmentConfigs();
  const CONFIG_INDEX = 2;
  const assignmentConfig = allConfigs[CONFIG_INDEX];
  if (!assignmentConfig) {
    throw new Error(`No Canvas assignment config at index ${CONFIG_INDEX}.`);
  }
  if (!assignmentConfig.submissionType) {
    throw new Error(`Selected config at index ${CONFIG_INDEX} has no submissionType.`);
  }

  const { credentials } = getCanvasConfig();

  test('Create, submit, PG extracts summary, publish, verify LMS (SpeedGrader)', async ({
    canvasTeacherPage,
    canvasStudentPage,
  }) => {
    test.setTimeout(1_200_000);
    AllureHelper.label('lms', 'canvas');
    AllureHelper.label('caseConfig', `canvas|verify-lms|${assignmentConfig.title}`);
    AllureHelper.label('testCaseId', C69070);
    AllureHelper.label('caseStatus', `${C69070.split(':')[0]}:not_reached`);
    AllureHelper.label('testCaseId', C69002);
    if (assignmentConfig.submissionType !== 'Text Entry') {
      AllureHelper.label('testCaseId', C69098);
      AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:not_reached`);
    }

    const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;
    const teacher = new CanvasLMS(canvasTeacherPage.page);
    const student = new CanvasLMSStudent(canvasStudentPage.page);
    const submissionType = assignmentConfig.submissionType!;

    console.log(`\n===== PG + LMS verify: ${uniqueTitle} (config index ${CONFIG_INDEX}) =====`);

    let extractedSummary: GradingSummary;

    await AllureHelper.step('1. Create assignment in Canvas', async () => {
      await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
    });

    const teacherUrl = teacher.page.url();
    const { courseId, assignmentId } = parseCourseAndAssignmentIdsFromUrl(teacherUrl);

    await AllureHelper.step(`2. Submit assignment (${submissionType})`, async () => {
      await waitForStudentAssignmentToAppearByUrl(student, courseId, assignmentId, uniqueTitle);

      const commentMeta = { uniqueTitle, studentLabel: credentials.studentUsername };
      if (submissionType === 'Text Entry') {
        await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText(), commentMeta);
      } else {
        const filePath = getSubmissionFilePath(submissionType as any);
        const text = submissionType === '.txt' ? getSubmissionText() : undefined;
        await student.verifyFileTypeAndSubmit(submissionType, filePath, text, commentMeta);
      }
    });

    await AllureHelper.step('3. Open PowerGrader, run AI grade path, extract summary, publish', async () => {
      await teacher.navigateToCourse();
      const pg = await teacher.navigateToPowerGrader();

      const powerGrader = new PowerGrader(pg);
      extractedSummary = await powerGrader.gradeAssignmentAndExtractSummary(uniqueTitle);

      await AllureHelper.attachJSON('PowerGrader GradingSummary', extractedSummary);
    });

    await AllureHelper.step('4. Verify LMS (Canvas SpeedGrader) against extracted summary', async () => {
      await teacher.verifyLmsScore(uniqueTitle, extractedSummary);
    });
  });
});
