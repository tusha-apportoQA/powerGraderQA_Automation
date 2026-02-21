import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';

test.describe('Canvas Orchestration @canvas @orchestration', () => {
  const allConfigs = getCanvasAssignmentConfigs();
  const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

  // Run orchestration serially to reduce contention + flake
  test.describe.configure({ mode: 'serial' });

  const studentUser = testUsers.find(u => u.role === 'student');
  if (!studentUser) throw new Error('Student user not found in test users configuration');
  const studentEmail = studentUser.username;

  for (const config of ASSIGNMENT_CONFIGS) {
    test(`Canvas Orchestration: ${config.title}`, async ({ canvasTeacherPage, canvasStudentPage }) => {
      test.setTimeout(1_200_000);

      const t0 = Date.now();
      const uniqueTitle = `${config.title} [${Date.now()}]`;

      const teacher = new CanvasLMS(canvasTeacherPage.page);
      const student = new CanvasLMSStudent(canvasStudentPage.page);

      console.log(`\n===== START: ${uniqueTitle} =====`);

      // ---- CREATE ----
      const tCreateStart = Date.now();
      await AllureHelper.step('Create assignment', async () => {
        await teacher.createAssignment({ ...config, title: uniqueTitle });
      });
      const createMs = Date.now() - tCreateStart;
      console.log(`Create time: ${(createMs / 1000).toFixed(1)}s`);

      // ---- SUBMIT (optional) ----
      let submitMs = 0;
      const submissionType = config.submissionType;

      if (submissionType) {
        const tSubmitStart = Date.now();

        await AllureHelper.step(`Submit (${submissionType})`, async () => {
          const { courseName } = getCanvasConfig();

          await student.dashboardPage.goto(student.baseURL);
          await student.dashboardPage.selectCourse(courseName);
          await student.coursePage.clickAssignments();
          await student.assignmentListPage.clickAssignment(uniqueTitle);

          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionType as any);
            await student.verifyFileTypeAndSubmit(submissionType, filePath);
          }
        });

        submitMs = Date.now() - tSubmitStart;
        console.log(`Submit time: ${(submitMs / 1000).toFixed(1)}s`);
      }

      // ---- GRADE + PUBLISH ----
      const tGradeStart = Date.now();

      await AllureHelper.step('Navigate to PowerGrader', async () => {
        await teacher.navigateToCourse();
      });

      await AllureHelper.step('Grade & publish', async () => {
        const pg = await teacher.navigateToPowerGrader();
        await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail);
      });

      const gradeMs = Date.now() - tGradeStart;
      const totalMs = Date.now() - t0;

      console.log(`Grade time: ${(gradeMs / 1000).toFixed(1)}s`);
      console.log(`TOTAL time: ${(totalMs / 1000).toFixed(1)}s`);
      console.log(`===== END =====\n`);

      // ---- ALLURE ----
      await AllureHelper.parameter('Create time', `${(createMs / 1000).toFixed(1)}s`);
      if (submitMs) await AllureHelper.parameter('Submit time', `${(submitMs / 1000).toFixed(1)}s`);
      await AllureHelper.parameter('Grade time', `${(gradeMs / 1000).toFixed(1)}s`);
      await AllureHelper.parameter('Total orchestration', `${(totalMs / 1000).toFixed(1)}s`);

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