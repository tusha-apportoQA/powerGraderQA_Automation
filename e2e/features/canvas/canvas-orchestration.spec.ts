
import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import {
  POW891,
  POW892,
  POW894,
  POW895,
  POW896,
  POW897,
  POW898,
  POW899,
  POW1001,
  POW1002,
  POW1003,
  POW1005,
  POW1006,
  POW1008,
  POW1009,
  POW910,
  POW913,
  POW920,
  POW922,
  POW998,
  POW893,
  POW1012,
  POW936,
  POW937,
  POW997,
  POW931,
  POW1018,
  POW1035,
  POW942,
  POW944,
  POW948,
  POW949,
} from '../../test-data/testCaseIds';
import { getCanvasConfig } from '../../config/canvas.config';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout";
import { Page } from '@playwright/test';

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
  const ASSIGNMENT_CONFIGS = allConfigs

  const studentUser = testUsers.find(u => u.role === 'student');
  if (!studentUser) throw new Error('Student user not found in test users configuration');
  const studentEmail = studentUser.username;

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Canvas Orchestration: ${assignmentConfig.title}`, async ({ canvasTeacherPage, canvasStudentPage }) => {
      test.setTimeout(2_400_000);
      AllureHelper.label('lms', 'canvas');
      AllureHelper.label('caseConfig', `canvas|orchestration|${assignmentConfig.title}`);

      const isInvalidSubmission = !!assignmentConfig.workflow.invalidSubmission;

      AllureHelper.label('testCaseId', POW913);
      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW998);
        AllureHelper.label('testCaseId', POW944);
      }
      if (assignmentConfig.submissionType === 'Text Entry') {
        AllureHelper.label('testCaseId', POW920);
      }
      if (assignmentConfig.submissionType === '.docx') {
        AllureHelper.label('testCaseId', POW931);
      }
      if (assignmentConfig.submissionType === '.csv' || assignmentConfig.submissionType === '.xlsx') {
        AllureHelper.label('testCaseId', POW942);
        AllureHelper.label('caseStatus', `${POW942.split(':')[0]}:not_reached`);
      }
      if (assignmentConfig.teacherEdits?.length) {
        AllureHelper.label('testCaseId', POW937);
      }
      if (assignmentConfig.rubric?.type === 'no') {
        AllureHelper.label('testCaseId', POW1006);
        AllureHelper.label('testCaseId', POW1001);
        AllureHelper.label('testCaseId', POW1003);
        AllureHelper.label('testCaseId', POW1012);
        if (!isInvalidSubmission) {
          AllureHelper.label('caseStatus', `${POW1012.split(':')[0]}:not_reached`);
        }
        AllureHelper.label('testCaseId', POW1018);
        if (!isInvalidSubmission) {
          AllureHelper.label('caseStatus', `${POW1018.split(':')[0]}:not_reached`);
        }
      } else if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW1002);
        AllureHelper.label('caseStatus', `${POW1002.split(':')[0]}:not_reached`);
      }
      if (assignmentConfig.rubric?.type === 'new') {
      }
      if (assignmentConfig.rubric?.type === 'existing') {
        AllureHelper.label('testCaseId', POW1008);
      }
      if (
        !isInvalidSubmission &&
        assignmentConfig.rubric &&
        assignmentConfig.rubric.type !== 'no' &&
        assignmentConfig.rubric.criteriaOrder?.length
      ) {
        AllureHelper.label('testCaseId', POW1009);
        AllureHelper.label('caseStatus', `${POW1009.split(':')[0]}:not_reached`);
      }
      if (isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW936);
        AllureHelper.label('caseStatus', `${POW936.split(':')[0]}:not_reached`);
      }

      const runStart = Date.now();
      const baselineKey = assignmentConfig.title; 
      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;

      const teacher = new CanvasLMS(canvasTeacherPage.page);
      const student = new CanvasLMSStudent(canvasStudentPage.page);
      const submissionType = assignmentConfig.submissionType;
      const submissionFile = assignmentConfig.submissionFile;

      // LMS verify runs inside workflow (teacher); same Allure case IDs as verifyLmsScoreTest
      AllureHelper.label('testCaseId', POW910);
      AllureHelper.label('caseStatus', `${POW910.split(':')[0]}:not_reached`);
      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW1005);
      }
      if (submissionType && submissionType !== 'Text Entry') {
        AllureHelper.label('testCaseId', POW922);
        AllureHelper.label('caseStatus', `${POW922.split(':')[0]}:not_reached`);
      }

      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW997);
        AllureHelper.label('caseStatus', `${POW997.split(':')[0]}:not_reached`);
        AllureHelper.label('testCaseId', POW948);
        AllureHelper.label('caseStatus', `${POW948.split(':')[0]}:not_reached`);
      }
      AllureHelper.label('testCaseId', POW949);
      AllureHelper.label('caseStatus', `${POW949.split(':')[0]}:not_reached`);
      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW1035);
        AllureHelper.label('caseStatus', `${POW1035.split(':')[0]}:not_reached`);
        if (assignmentConfig.workflow.lmsVerifySave) {
          AllureHelper.label('testCaseId', POW893);
          AllureHelper.label('caseStatus', `${POW893.split(':')[0]}:not_reached`);
        }

        if (submissionType === '.txt') {
          AllureHelper.label('testCaseId', POW891);
          AllureHelper.label('caseStatus', `${POW891.split(':')[0]}:not_reached`);
        } else if (submissionType === '.pdf') {
          AllureHelper.label('testCaseId', POW894);
          AllureHelper.label('caseStatus', `${POW894.split(':')[0]}:not_reached`);
        } else if (submissionType === '.docx') {
          AllureHelper.label('testCaseId', POW896);
          AllureHelper.label('caseStatus', `${POW896.split(':')[0]}:not_reached`);
        } else if (submissionType === 'Text Entry') {
          AllureHelper.label('testCaseId', POW898);
          AllureHelper.label('caseStatus', `${POW898.split(':')[0]}:not_reached`);
        }

        if (assignmentConfig.title.toLowerCase().includes('elc')) {
          if (submissionType === '.txt') {
            AllureHelper.label('testCaseId', POW892);
            AllureHelper.label('caseStatus', `${POW892.split(':')[0]}:not_reached`);
          } else if (submissionType === '.pdf') {
            AllureHelper.label('testCaseId', POW895);
            AllureHelper.label('caseStatus', `${POW895.split(':')[0]}:not_reached`);
          } else if (submissionType === '.docx') {
            AllureHelper.label('testCaseId', POW897);
            AllureHelper.label('caseStatus', `${POW897.split(':')[0]}:not_reached`);
          } else if (submissionType === 'Text Entry') {
            AllureHelper.label('testCaseId', POW899);
            AllureHelper.label('caseStatus', `${POW899.split(':')[0]}:not_reached`);
          }
        }
      }

      console.log(`\n===== START: ${uniqueTitle} =====`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      await AllureHelper.step('Create assignment in Canvas', async () => {
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
        if (assignmentConfig.rubric?.type === 'new') {
        }
        if (assignmentConfig.rubric?.type === 'existing') {
          AllureHelper.label('caseStatus', `${POW1008.split(':')[0]}:passed`);
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
          AllureHelper.label('caseStatus', `${POW910.split(':')[0]}:reached`);
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          const commentMeta = { uniqueTitle, studentLabel: getCanvasConfig().credentials.studentUsername };
          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionFile);
            const text = submissionType === '.txt' ? getSubmissionText() : undefined;
            await student.verifyFileTypeAndSubmit(submissionType, filePath, text, commentMeta);
          }
        });
        submitMs = Date.now() - submitStart;
      }

      // ---------------- GRADE + PUBLISH ----------------
      const gradeStart = Date.now();
      await AllureHelper.step('Navigate to course (teacher)', async () => {
        await teacher.navigateToCourse();
      });

      let pg!: Page;
      await AllureHelper.step('Navigate to PowerGrader', async () => {
        AllureHelper.label('caseStatus', `${POW949.split(':')[0]}:reached`);
        pg = await teacher.navigateToPowerGrader();
      });

      await AllureHelper.step('Run Universal PG Workflow', async () => {
        console.log(`[${uniqueTitle}] 🚀 [START] Grade and Publish Workflow`);

        await runPGOrSkipOnTimeout(async () => {
          await executeUniversalPGWorkflow(
            pg,
            uniqueTitle,
            studentEmail,
            assignmentConfig,
            'canvas',
            teacher,
          );
        }, pg);

        console.log(`[${uniqueTitle}] ✅ [END] Universal PG Workflow`);
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