/*import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { MoodleLMS } from '../../components/lms/moodle/MoodleLMS';
import { MoodleLMSStudent } from '../../components/lms/moodle/MoodleLMSStudent';
import { getMoodleAssignmentConfigs } from '../../test-data/assignments/moodle';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getMoodleConfig } from '../../config/moodle.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout";

const studentUser = testUsers.find(u => u.role === 'student');
const studentEmail = studentUser?.username ?? '';
if (!studentEmail) {
  throw new Error('Student user not found in test users configuration');
}

/**
 * Poll until the assignment appears on the course page for the student (dashboard → course → check link).
 */
/*async function waitForAssignmentToAppearOnCoursePage(
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
      console.log(`[${labelForLogs}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - checking course page...`);
      await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.expectDashboardLoaded();
      await student.dashboardPage.selectCourse(courseName);
      await student.coursePage.expectCoursePageLoaded();

      const visible = await student.coursePage.hasAssignmentLink(assignmentTitle);
      if (visible) {
        console.log(`[${labelForLogs}] Student Sync: assignment visible on course page ✅`);
        return;
      }
    } catch {
      // continue
    }
    console.log(`[${labelForLogs}] Student Sync: assignment not visible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
    await student.page.waitForTimeout(intervalMs);
  }

  throw new Error(`Timed out waiting for assignment to appear on course page for: "${labelForLogs}"`);
}

test.describe('Moodle Orchestration @moodle @orchestration', () => {
  const allConfigs = getMoodleAssignmentConfigs();
  const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

  test.describe.configure({ mode: 'serial' });

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Moodle Orchestration: ${assignmentConfig.title}`, async ({ moodleTeacherPage, moodleStudentPage }) => {
      test.setTimeout(1_200_000);

      const runStart = Date.now();
      const baselineKey = assignmentConfig.title; // stable across runs

      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;

      const teacher = new MoodleLMS(moodleTeacherPage.page);
      const student = new MoodleLMSStudent(moodleStudentPage.page);

      const submissionType = assignmentConfig.submissionType;
      const { courseName } = getMoodleConfig();

      console.log(`\n===== START: ${uniqueTitle} =====`);
      console.log(`[${uniqueTitle}] Config: rubric=${assignmentConfig.rubric?.type ?? 'unknown'} | submission=${submissionType ?? 'none'}`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      console.log(`[${uniqueTitle}] 🚀 Starting Assignment Creation...`);

      await AllureHelper.step('Create assignment in Moodle', async () => {
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
      });

      const createMs = Date.now() - createStart;
      console.log(`[${uniqueTitle}] ✅ Assignment created. Create time: ${(createMs / 1000).toFixed(1)}s`);

      // ---------------- SUBMIT ----------------
      let submitMs = 0;

      if (submissionType && courseName) {
        const submitStart = Date.now();
        console.log(`[${uniqueTitle}] 📩 Starting Student Submission...`);

        await AllureHelper.step('Wait for assignment to be accessible for student', async () => {
          await waitForAssignmentToAppearOnCoursePage(student, uniqueTitle, courseName, uniqueTitle, {
            maxWaitMs: 8 * 60 * 1000,
            intervalMs: 15 * 1000
          });
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          await student.navigateToAssignmentDetails(uniqueTitle, courseName);
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
        if (!submissionType) console.log(`[${uniqueTitle}] ℹ️ No submissionType; skipping submission step.`);
        if (!courseName) console.log(`[${uniqueTitle}] ℹ️ No courseName; skipping submission step.`);
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

          await runPGOrSkipOnTimeout(async () => {
          //await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail);
          await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail, baselineKey);
        });

          console.log(`[${uniqueTitle}] ✅ [END] Grade and Publish Workflow`);
        });
      });
      const gradeMs = Date.now() - gradeStart;
      const totalMs = Date.now() - runStart;
      console.log(`[${uniqueTitle}] Grade time: ${(gradeMs / 1000).toFixed(1)}s`);
      //console.log(`[${uniqueTitle}] TOTAL time: ${(totalMs / 1000).toFixed(1)}s`);
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
});*/

import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { MoodleLMS } from '../../components/lms/moodle/MoodleLMS';
import { MoodleLMSStudent } from '../../components/lms/moodle/MoodleLMSStudent';
import { getMoodleAssignmentConfigs } from '../../test-data/assignments/moodle';
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
  POW902,
  POW903,
  POW904,
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
import { getMoodleConfig } from '../../config/moodle.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout";
import { Page } from '@playwright/test';

const studentUser = testUsers.find(u => u.role === 'student');
const studentEmail = studentUser?.username ?? '';
if (!studentEmail) {
  throw new Error('Student user not found in test users configuration');
}

/**
 * Poll until the assignment appears on the course page for the student (dashboard → course → check link).
 */
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
      console.log(`[${labelForLogs}] Student Sync: attempt ${attempt} (elapsed ${elapsedSec}s) - checking course page...`);
      await student.dashboardPage.goto(student.baseURL);
      await student.dashboardPage.expectDashboardLoaded();
      await student.dashboardPage.selectCourse(courseName);
      await student.coursePage.expectCoursePageLoaded();

      const visible = await student.coursePage.hasAssignmentLink(assignmentTitle);
      if (visible) {
        console.log(`[${labelForLogs}] Student Sync: assignment visible on course page ✅`);
        return;
      }
    } catch {
      // continue
    }
    console.log(`[${labelForLogs}] Student Sync: assignment not visible yet... retrying in ${Math.round(intervalMs / 1000)}s`);
    await student.page.waitForTimeout(intervalMs);
  }

  throw new Error(`Timed out waiting for assignment to appear on course page for: "${labelForLogs}"`);
}

test.describe('Moodle Orchestration @moodle @orchestration', () => {
  const allConfigs = getMoodleAssignmentConfigs();
  const ASSIGNMENT_CONFIGS = allConfigs

  //test.describe.configure({ mode: 'serial' });

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Moodle Orchestration: ${assignmentConfig.title}`, async ({ moodleTeacherPage, moodleStudentPage }) => {
      test.setTimeout(1_800_000);
      AllureHelper.label('lms', 'moodle');
      AllureHelper.label('caseConfig', `moodle|orchestration|${assignmentConfig.title}`);

      const isInvalidSubmission = !!assignmentConfig.workflow.invalidSubmission;

      AllureHelper.label('testCaseId', POW904);
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

      const teacher = new MoodleLMS(moodleTeacherPage.page);
      const student = new MoodleLMSStudent(moodleStudentPage.page);

      const submissionType = assignmentConfig.submissionType;
      const submissionFile = assignmentConfig.submissionFile;
      const { courseName } = getMoodleConfig();

      // LMS verify runs inside workflow (teacher); same Allure case IDs as verifyLmsScoreTest
      AllureHelper.label('testCaseId', POW902);
      AllureHelper.label('caseStatus', `${POW902.split(':')[0]}:not_reached`);
      AllureHelper.label('testCaseId', POW903);
      AllureHelper.label('caseStatus', `${POW903.split(':')[0]}:not_reached`);
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
      console.log(`[${uniqueTitle}] Config: rubric=${assignmentConfig.rubric?.type ?? 'unknown'} | submission=${submissionType ?? 'none'}`);

      // ---------------- CREATE ----------------
      const createStart = Date.now();
      console.log(`[${uniqueTitle}] 🚀 Starting Assignment Creation...`);

      await AllureHelper.step('Create assignment in Moodle', async () => {
        await teacher.createAssignment({ ...assignmentConfig, title: uniqueTitle });
        if (assignmentConfig.rubric?.type === 'new') {
        }
        if (assignmentConfig.rubric?.type === 'existing') {
          AllureHelper.label('caseStatus', `${POW1008.split(':')[0]}:passed`);
        }
      });

      const createMs = Date.now() - createStart;
      console.log(`[${uniqueTitle}] ✅ Assignment created. Create time: ${(createMs / 1000).toFixed(1)}s`);

      // ---------------- SUBMIT ----------------
      let submitMs = 0;

      if (submissionType && courseName) {
        const submitStart = Date.now();
        console.log(`[${uniqueTitle}] 📩 Starting Student Submission...`);

        await AllureHelper.step('Wait for assignment to be accessible for student', async () => {
          await waitForAssignmentToAppearOnCoursePage(student, uniqueTitle, courseName, uniqueTitle, {
            maxWaitMs: 8 * 60 * 1000,
            intervalMs: 15 * 1000
          });
          AllureHelper.label('caseStatus', `${POW902.split(':')[0]}:reached`);
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          await student.navigateToAssignmentDetails(uniqueTitle, courseName);
          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionFile);
            // POW922 disabled for Moodle: omit commentMeta so it stays not_reached in Allure.
            await student.verifyFileTypeAndSubmit(submissionType, filePath);
          }
          AllureHelper.label('caseStatus', `${POW903.split(':')[0]}:reached`);
        });

        submitMs = Date.now() - submitStart;
        console.log(`[${uniqueTitle}] ✅ Submission complete. Submit time: ${(submitMs / 1000).toFixed(1)}s`);
      } else {
        if (!submissionType) console.log(`[${uniqueTitle}] ℹ️ No submissionType; skipping submission step.`);
        if (!courseName) console.log(`[${uniqueTitle}] ℹ️ No courseName; skipping submission step.`);
      }

      // ---------------- GRADE + PUBLISH ----------------
      const gradeStart = Date.now();
      console.log(`[${uniqueTitle}] 🚀 Launching PowerGrader Tool...`);

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
            'moodle',
            teacher,
          );
        }, pg);

        console.log(`[${uniqueTitle}] ✅ [END] Grade and Publish Workflow`);
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
