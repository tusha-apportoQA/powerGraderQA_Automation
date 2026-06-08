
import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import {
  C68998,
  C68999,
  C69000,
  C69002,
  C69036,
  C69038,
  C69039,
  C69070,
  C69074,
  C69092,
  C69098,
  C69100,
  C75511,
  C75529,
  C75645,
  C78819,
  C78820,
  C78823,
} from '../../test-data/testCaseIds';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout";

/**
 * Poll until the student can open the assignment details page by direct URL.
 * This avoids races / title mismatches in the student assignment list.
 */
/*async function waitForStudentAssignmentToAppearByUrl( 
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
      //await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.goto(url);

      await student.dashboardPage.expectDashboardLoaded();

      await student.page.goto(url, { waitUntil: 'domcontentloaded' });
      await student.assignmentDetailsPage.waitForLoad();

      console.log(`[${labelForLogs}] Student Sync: assignment page opened ✅`);
      return;
    /*} catch (e) {
      console.log(`[${labelForLogs}] Student Sync: not accessible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
      await student.page.waitForTimeout(intervalMs);
    }*/
    /*} catch (e) {
        console.log(`[${labelForLogs}] Student Sync: not accessible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
        if (student.page.isClosed()) {
          console.log(`[${labelForLogs}] Student Sync: page was closed, reopening...`);
          //student.page = await student.context.newPage();
           student.page = await student.page.context().newPage();
        }
        await student.page.waitForTimeout(intervalMs);
      }
  }
  throw new Error(`Timed out waiting for student to access assignment page for: "${labelForLogs}"`);
}*/

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
      //await student.dashboardPage.goto(url);
      //await student.dashboardPage.expectDashboardLoaded();
      await student.page.goto(url, { waitUntil: 'domcontentloaded' });
      //await student.page.goto(url, { waitUntil: 'domcontentloaded' });
      await student.assignmentDetailsPage.waitForLoad();

      console.log(`[${labelForLogs}] Student Sync: assignment page opened ✅`);
      return;
    } catch (e) {
      console.log(`[${labelForLogs}] Student Sync: not accessible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
      console.log(`[${labelForLogs}] Student Sync: ERROR: ${e instanceof Error ? e.message : String(e)}`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
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
  const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 6);

  const studentUser = testUsers.find(u => u.role === 'student');
  if (!studentUser) throw new Error('Student user not found in test users configuration');
  const studentEmail = studentUser.username;

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Canvas Orchestration: ${assignmentConfig.title}`, async ({ canvasTeacherPage, canvasStudentPage }) => {
      test.setTimeout(2_400_000);
      AllureHelper.label('lms', 'canvas');
      AllureHelper.label('caseConfig', `canvas|orchestration|${assignmentConfig.title}`);
      AllureHelper.label('testCaseId', C69074);
      AllureHelper.label('testCaseId', C69100);
      AllureHelper.label('testCaseId', C78823);
      if (assignmentConfig.submissionType === 'Text Entry') {
        AllureHelper.label('testCaseId', C69092);
      }
      if (assignmentConfig.submissionType === '.docx') {
        AllureHelper.label('testCaseId', C75645);
      }
      if (assignmentConfig.submissionType === '.csv' || assignmentConfig.submissionType === '.xlsx') {
        AllureHelper.label('testCaseId', C78819);
        AllureHelper.label('caseStatus', `${C78819.split(':')[0]}:not_reached`);
        AllureHelper.label('testCaseId', C78820);
        AllureHelper.label('caseStatus', `${C78820.split(':')[0]}:not_reached`);
      }
      if (assignmentConfig.teacherEdits?.length) {
        AllureHelper.label('testCaseId', C75511);
      }
      if (assignmentConfig.rubric?.type === 'no') {
        AllureHelper.label('testCaseId', C69036);
        AllureHelper.label('testCaseId', C68998);
        AllureHelper.label('testCaseId', C69000);
      } else {
        AllureHelper.label('testCaseId', C68999);
        AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:not_reached`);
      }
      if (assignmentConfig.rubric?.type === 'new') {
        AllureHelper.label('testCaseId', C69038);
      }
      if (assignmentConfig.rubric?.type === 'existing') {
        AllureHelper.label('testCaseId', C69039);
      }

      const runStart = Date.now();
      const baselineKey = assignmentConfig.title; 
      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;

      const teacher = new CanvasLMS(canvasTeacherPage.page);
      const student = new CanvasLMSStudent(canvasStudentPage.page);
      const submissionType = assignmentConfig.submissionType;

      // LMS verify runs inside workflow (teacher); same Allure case IDs as verifyLmsScoreTest
      AllureHelper.label('testCaseId', C69070);
      AllureHelper.label('caseStatus', `${C69070.split(':')[0]}:not_reached`);
      AllureHelper.label('testCaseId', C69002);
      if (submissionType && submissionType !== 'Text Entry') {
        AllureHelper.label('testCaseId', C69098);
        AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:not_reached`);
      }

      AllureHelper.label('testCaseId', C75529);
      AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:not_reached`);

      console.log(`\n===== START: ${uniqueTitle} =====`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      await AllureHelper.step('Create assignment in Canvas', async () => {
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
        if (assignmentConfig.rubric?.type === 'new') {
          AllureHelper.label('caseStatus', `${C69038.split(':')[0]}:passed`);
        }
        if (assignmentConfig.rubric?.type === 'existing') {
          AllureHelper.label('caseStatus', `${C69039.split(':')[0]}:passed`);
        }
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
          AllureHelper.label('caseStatus', `${C69070.split(':')[0]}:reached`);
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
            //await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail, baselineKey, teacherEdits);
            await executeUniversalPGWorkflow(
              pg,
              uniqueTitle,
              studentEmail,
              baselineKey,
              'canvas',
              teacherEdits,
              teacher,
            );
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