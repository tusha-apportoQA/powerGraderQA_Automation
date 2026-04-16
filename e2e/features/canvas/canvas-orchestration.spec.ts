
import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout";

/**
 * Poll until the student can open the assignment details page by direct URL.
 * This avoids races / title mismatches in the student assignment list.
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
      console.log(`[${labelForLogs}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - opening assignment URL...`);
      await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.expectDashboardLoaded();

      await student.page.goto(url, { waitUntil: 'domcontentloaded' });
      await student.assignmentDetailsPage.waitForLoad();

      console.log(`[${labelForLogs}] Student Sync: assignment page opened ✅`);
      return;
    } catch (e) {
      console.log(`[${labelForLogs}] Student Sync: not accessible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
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

test.describe('Canvas Orchestration @canvas @orchestration', () => {
  const allConfigs = getCanvasAssignmentConfigs();
  const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

  const studentUser = testUsers.find(u => u.role === 'student');
  if (!studentUser) throw new Error('Student user not found in test users configuration');
  const studentEmail = studentUser.username;

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Canvas Orchestration: ${assignmentConfig.title}`, async ({ canvasTeacherPage, canvasStudentPage }) => {
      test.setTimeout(1_200_000);

      const runStart = Date.now();
      const baselineKey = assignmentConfig.title; 
      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;

      const teacher = new CanvasLMS(canvasTeacherPage.page);
      const student = new CanvasLMSStudent(canvasStudentPage.page);
      const submissionType = assignmentConfig.submissionType;

      console.log(`\n===== START: ${uniqueTitle} =====`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      await AllureHelper.step('Create assignment in Canvas', async () => {
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
      });
      const createMs = Date.now() - createStart;

      const teacherUrl = teacher.page.url();
      const { courseId, assignmentId } = parseCourseAndAssignmentIdsFromUrl(teacherUrl);

      // ---------------- SUBMIT ----------------
      let submitMs = 0;
      if (submissionType) {
        const submitStart = Date.now();
        await AllureHelper.step('Wait for assignment to be accessible for student', async () => {
          await waitForStudentAssignmentToAppearByUrl(student, courseId, assignmentId, uniqueTitle);
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionType as any);
            const text = submissionType === '.txt' ? getSubmissionText() : undefined;
            await student.verifyFileTypeAndSubmit(submissionType, filePath, text);
          }
        });
        submitMs = Date.now() - submitStart;
      }

      // ---------------- GRADE + PUBLISH ----------------
      const gradeStart = Date.now();
      await AllureHelper.step('Navigate to course (teacher)', async () => {
        await teacher.navigateToCourse();
      });

      await AllureHelper.step('Navigate to PowerGrader', async () => {
        const pg = await teacher.navigateToPowerGrader();

        // 🎯 FIX: teacherEdits defined here so it is in scope for the workflow call
        const teacherEdits = assignmentConfig.teacherEdits?.length
          ? { criteria: assignmentConfig.teacherEdits }
          : undefined;

        await AllureHelper.step('Run Grade & Publish Workflow', async () => {
          console.log(`[${uniqueTitle}] 🚀 [START] Grade and Publish Workflow`);
          
          await runPGOrSkipOnTimeout(async () => {
            await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail, baselineKey, teacherEdits);
          });
          
          console.log(`[${uniqueTitle}] ✅ [END] Grade and Publish Workflow`);
        });
      });

      const gradeMs = Date.now() - gradeStart;
      const totalMs = Date.now() - runStart;

      // ---------------- ALLURE METRICS ----------------
      AllureHelper.parameter('Create time', `${(createMs / 1000).toFixed(1)}s`);
      if (submitMs) AllureHelper.parameter('Submit time', `${(submitMs / 1000).toFixed(1)}s`);
      AllureHelper.parameter('Grade time', `${(gradeMs / 1000).toFixed(1)}s`);
      AllureHelper.parameter('Total orchestration', `${(totalMs / 1000).toFixed(1)}s`);
    });
  }
});