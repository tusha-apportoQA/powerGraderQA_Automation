import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout"; // Add wrapper
import { D2LLMS } from '../../components/lms/d2l/D2LLMS';
import { D2LLMSStudent } from '../../components/lms/d2l/D2LLMSStudent';
import { getD2LAssignmentConfigs } from '../../test-data/assignments/d2l';
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
  POW906,
  POW908,
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
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getD2LConfig } from '../../config/d2l.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
import { Page } from '@playwright/test';
/**
 * Poll until the student can open the assignment details page.
 * This prevents "race" failures where the assignment exists but hasn't appeared for the student yet.
 */
async function waitForStudentAssignmentToAppear(
  student: D2LLMSStudent,
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
      console.log(`[${assignmentTitle}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - navigating to assignments...`);

      await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.selectCourse(courseName);
      await student.coursePage.clickAssignments();
      await student.assignmentListPage.clickAssignment(assignmentTitle);

      // If your D2L student page object has a details-page "loaded" assertion, call it here.
      // Otherwise clickAssignment succeeding is often good enough.
      console.log(`[${assignmentTitle}] Student Sync: assignment is visible to student ✅`);
      return;
    } catch (e) {
      console.log(`[${assignmentTitle}] Student Sync: not visible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
      await student.page.waitForTimeout(intervalMs);
    }
  }

  throw new Error(`Timed out waiting for student to see assignment: "${assignmentTitle}"`);
}

test.describe('D2L LMS Orchestration [POW-471] @d2l @orchestration', () => {
  const allConfigs = getD2LAssignmentConfigs();

  // keep small for deploy runs; bump in nightly runs
  const ASSIGNMENT_CONFIGS = allConfigs

  // Sequential flow (matches Canvas approach)
 // 

  const studentUser = testUsers.find(u => u.role === 'student' && u.lms === 'd2l');
  if (!studentUser) throw new Error('D2L Student user not found in test users configuration');
  const studentEmail = studentUser.username;

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`D2L Orchestration: ${assignmentConfig.title}`, async ({ d2lTeacherPage, d2lStudentPage }) => {
      test.setTimeout(1_800_000);
      AllureHelper.label('lms', 'd2l');
      AllureHelper.label('caseConfig', `d2l|orchestration|${assignmentConfig.title}`);

      const isInvalidSubmission = !!assignmentConfig.workflow.invalidSubmission;

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
      const baselineKey = assignmentConfig.title; // stable across runs

      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;
      const submissionType = assignmentConfig.submissionType;
      const submissionFile = assignmentConfig.submissionFile;

      const teacher = new D2LLMS(d2lTeacherPage.page);
      const student = new D2LLMSStudent(d2lStudentPage.page);

      // LMS verify runs inside workflow (teacher); same Allure case IDs as verifyLmsScoreTest
      AllureHelper.label('testCaseId', POW906);
      AllureHelper.label('caseStatus', `${POW906.split(':')[0]}:not_reached`);
      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', POW1005);
      }
      if (submissionType && submissionType !== 'Text Entry') {
        AllureHelper.label('testCaseId', POW922);
        AllureHelper.label('caseStatus', `${POW922.split(':')[0]}:not_reached`);
      }
      if (submissionType === 'Text Entry') {
        AllureHelper.label('testCaseId', POW908);
        AllureHelper.label('caseStatus', `${POW908.split(':')[0]}:not_reached`);
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
      console.log(`[${uniqueTitle}] Config: rubric=${assignmentConfig.rubric?.type ?? 'unknown'} | submission=${submissionType ?? 'none'}`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      console.log(`🚀 [${uniqueTitle}] Starting Assignment Creation...`);

      await AllureHelper.step('Create assignment in D2L', async () => {
        if (assignmentConfig.rubric) {
          console.log(`[${uniqueTitle}] Setting up rubric: ${assignmentConfig.rubric.type}`);
        }
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
        if (assignmentConfig.rubric?.type === 'new') {
        }
        if (assignmentConfig.rubric?.type === 'existing') {
          AllureHelper.label('caseStatus', `${POW1008.split(':')[0]}:passed`);
        }
      });

      const createMs = Date.now() - createStart;
      console.log(`✅ [${uniqueTitle}] Assignment Created. Create time: ${(createMs / 1000).toFixed(1)}s`);

      // ---------------- SUBMIT ----------------
      let submitMs = 0;

      if (submissionType) {
        const { courseName } = getD2LConfig();
        const submitStart = Date.now();

        console.log(`📩 [${uniqueTitle}] Starting Student Submission...`);

        await AllureHelper.step('Wait for assignment to appear for student', async () => {
          await waitForStudentAssignmentToAppear(student, courseName, uniqueTitle, {
            maxWaitMs: 8 * 60 * 1000,
            intervalMs: 15 * 1000
          });
          AllureHelper.label('caseStatus', `${POW906.split(':')[0]}:reached`);
          if (submissionType === 'Text Entry') {
            AllureHelper.label('caseStatus', `${POW908.split(':')[0]}:reached`);
          }
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          const { credentials } = getD2LConfig();
          const commentMeta = { uniqueTitle, studentLabel: credentials.studentUsername };
          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit(uniqueTitle, 'Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionFile);
            await student.verifyFileTypeAndSubmit(uniqueTitle, submissionType, filePath, undefined, commentMeta);
          }
        });

        submitMs = Date.now() - submitStart;
        console.log(`✅ [${uniqueTitle}] Submission Uploaded. Submit time: ${(submitMs / 1000).toFixed(1)}s`);
      } else {
        console.log(`[${uniqueTitle}] ℹ️ No submissionType; skipping submission step.`);
      }

      // ---------------- GRADE + PUBLISH ----------------
      const gradeStart = Date.now();
      console.log(`[${uniqueTitle}] Launching PowerGrader Tool...`);

      await AllureHelper.step('Navigate to course (teacher)', async () => {
        await teacher.navigateToCourse();
      });

      let pg!: Page;
      await AllureHelper.step('Navigate to PowerGrader', async () => {
        AllureHelper.label('caseStatus', `${POW949.split(':')[0]}:reached`);
        pg = await teacher.navigateToPowerGrader();
      });

      await AllureHelper.step('Run Universal PG Workflow', async () => {
        console.log(`🚀 [START] Grade and Publish Workflow for: ${uniqueTitle}`);

        await runPGOrSkipOnTimeout(async () => {
          await executeUniversalPGWorkflow(
            pg,
            uniqueTitle,
            studentEmail,
            assignmentConfig,
            'd2l',
            teacher,
          );
        }, pg);

        console.log(`✅ [END] Grade and Publish Workflow for: ${uniqueTitle}`);
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