import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';

/**
 * Poll until the student can open the assignment details page.
 * This replaces the old "natural delay" you got from splitting create/submit/grade into separate tests.
 */
async function waitForStudentAssignmentToAppear(
  student: CanvasLMSStudent,
  courseName: string,
  assignmentTitle: string,
  opts?: { maxWaitMs?: number; intervalMs?: number }
): Promise<void> {
  const maxWaitMs = opts?.maxWaitMs ?? 8 * 60 * 1000; // 8 min
  const intervalMs = opts?.intervalMs ?? 15 * 1000; // 15 sec
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < maxWaitMs) {
    attempt += 1;
    const elapsedSec = ((Date.now() - start) / 1000).toFixed(0);

    try {
      console.log(`[${assignmentTitle}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - navigating to assignments list...`);

      await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.expectDashboardLoaded();
      await student.dashboardPage.selectCourse(courseName);
      await student.coursePage.expectCoursePageLoaded();
      await student.coursePage.clickAssignments();
      await student.assignmentListPage.expectAssignmentsListLoaded();

      console.log(`[${assignmentTitle}] Student Sync: looking for assignment row...`);
      await student.assignmentListPage.clickAssignment(assignmentTitle);

      await student.assignmentDetailsPage.expectAssignmentDetailsLoaded();
      await student.assignmentDetailsPage.verifyAssignmentTitle(assignmentTitle);

      console.log(`[${assignmentTitle}] Student Sync: assignment is visible to student ✅`);
      return;
    } catch (e) {
      console.log(`[${assignmentTitle}] Student Sync: not visible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
      await student.page.waitForTimeout(intervalMs);
    }
  }

  throw new Error(`Timed out waiting for student to see assignment: "${assignmentTitle}"`);
}

test.describe('Canvas Orchestration @canvas @orchestration', () => {
  const allConfigs = getCanvasAssignmentConfigs();
  const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

  // Sequential, as requested
  test.describe.configure({ mode: 'serial' });

  const studentUser = testUsers.find(u => u.role === 'student');
  if (!studentUser) throw new Error('Student user not found in test users configuration');
  const studentEmail = studentUser.username;

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Canvas Orchestration: ${assignmentConfig.title}`, async ({ canvasTeacherPage, canvasStudentPage }) => {
      test.setTimeout(1_200_000);

      const runStart = Date.now();
      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;

      const teacher = new CanvasLMS(canvasTeacherPage.page);
      const student = new CanvasLMSStudent(canvasStudentPage.page);

      const submissionType = assignmentConfig.submissionType;

      console.log(`\n===== START: ${uniqueTitle} =====`);
      console.log(`[${uniqueTitle}] Config: rubric=${assignmentConfig.rubric?.type ?? 'unknown'} | submission=${submissionType ?? 'none'}`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      console.log(`[${uniqueTitle}] 🚀 Starting Assignment Creation...`);

      await AllureHelper.step('Create assignment in Canvas', async () => {
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
      });

      const createMs = Date.now() - createStart;
      console.log(`[${uniqueTitle}] ✅ Assignment created. Create time: ${(createMs / 1000).toFixed(1)}s`);

      // ---------------- SUBMIT ----------------
      let submitMs = 0;

      if (submissionType) {
        const { courseName } = getCanvasConfig();

        const submitStart = Date.now();
        console.log(`[${uniqueTitle}] 📩 Starting Student Submission...`);

        await AllureHelper.step('Wait for assignment to appear for student', async () => {
          await waitForStudentAssignmentToAppear(student, courseName, uniqueTitle, {
            maxWaitMs: 8 * 60 * 1000,
            intervalMs: 15 * 1000
          });
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          // We should already be on the assignment details page from the polling function.
          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionType as any);
            await student.verifyFileTypeAndSubmit(submissionType, filePath);
          }
        });

        submitMs = Date.now() - submitStart;
        console.log(`[${uniqueTitle}] ✅ Submission complete. Submit time: ${(submitMs / 1000).toFixed(1)}s`);
      } else {
        console.log(`[${uniqueTitle}] ℹ️ No submissionType; skipping submission step.`);
      }

      // ---------------- GRADE + PUBLISH ----------------
      const gradeStart = Date.now();
      console.log(`[${uniqueTitle}] 🚀 Launching PowerGrader Tool...`);

      await AllureHelper.step('Navigate to course (teacher)', async () => {
        await teacher.navigateToCourse();
      });

      await AllureHelper.step('Navigate to PowerGrader', async () => {
        const pg = await teacher.navigateToPowerGrader();

        await AllureHelper.step('Run Grade & Publish Workflow', async () => {
          console.log(`[${uniqueTitle}] 🚀 [START] Grade and Publish Workflow`);
          await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail);
          console.log(`[${uniqueTitle}] ✅ [END] Grade and Publish Workflow`);
        });
      });

      const gradeMs = Date.now() - gradeStart;
      const totalMs = Date.now() - runStart;

      console.log(`[${uniqueTitle}] Grade time: ${(gradeMs / 1000).toFixed(1)}s`);
      console.log(`[${uniqueTitle}] TOTAL time: ${(totalMs / 1000).toFixed(1)}s`);
      console.log(`===== END: ${uniqueTitle} =====\n`);

      // ---------------- ALLURE METRICS ----------------
      AllureHelper.parameter('Create time', `${(createMs / 1000).toFixed(1)}s`);
      if (submitMs) AllureHelper.parameter('Submit time', `${(submitMs / 1000).toFixed(1)}s`);
      AllureHelper.parameter('Grade time', `${(gradeMs / 1000).toFixed(1)}s`);
      AllureHelper.parameter('Total orchestration', `${(totalMs / 1000).toFixed(1)}s`);

      await AllureHelper.attachText(
        'Timing Summary',
        `Create: ${(createMs / 1000).toFixed(1)}s
Submit: ${(submitMs / 1000).toFixed(1)}s
Grade: ${(gradeMs / 1000).toFixed(1)}s
Total: ${(totalMs / 1000).toFixed(1)}s`
      );
    });
  }
});