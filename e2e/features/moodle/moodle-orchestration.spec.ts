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
  C68956,
  C68958,
  C68960,
  C68962,
  C68998,
  C68999,
  C69000,
  C69002,
  C69036,
  C69038,
  C69039,
  C69060,
  C69061,
  C69063,
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
  const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);

  //test.describe.configure({ mode: 'serial' });

  for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
    test(`Moodle Orchestration: ${assignmentConfig.title}`, async ({ moodleTeacherPage, moodleStudentPage }) => {
      test.setTimeout(1_800_000);
      AllureHelper.label('lms', 'moodle');
      AllureHelper.label('caseConfig', `moodle|orchestration|${assignmentConfig.title}`);
      AllureHelper.label('testCaseId', C69063);
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
      const baselineKey = assignmentConfig.title; // stable across runs

      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;

      const teacher = new MoodleLMS(moodleTeacherPage.page);
      const student = new MoodleLMSStudent(moodleStudentPage.page);

      const submissionType = assignmentConfig.submissionType;
      const submissionFile = assignmentConfig.submissionFile;
      const { courseName } = getMoodleConfig();

      // LMS verify runs inside workflow (teacher); same Allure case IDs as verifyLmsScoreTest
      AllureHelper.label('testCaseId', C69060);
      AllureHelper.label('caseStatus', `${C69060.split(':')[0]}:not_reached`);
      AllureHelper.label('testCaseId', C69061);
      AllureHelper.label('caseStatus', `${C69061.split(':')[0]}:not_reached`);
      AllureHelper.label('testCaseId', C69002);
      if (submissionType && submissionType !== 'Text Entry') {
        AllureHelper.label('testCaseId', C69098);
        AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:not_reached`);
      }

      AllureHelper.label('testCaseId', C75529);
      AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:not_reached`);

      if (assignmentConfig.title.toLowerCase().includes('elc')) {
        if (submissionType === '.txt') {
          AllureHelper.label('testCaseId', C68956);
          AllureHelper.label('caseStatus', `${C68956.split(':')[0]}:not_reached`);
        } else if (submissionType === '.pdf') {
          AllureHelper.label('testCaseId', C68958);
          AllureHelper.label('caseStatus', `${C68958.split(':')[0]}:not_reached`);
        } else if (submissionType === '.docx') {
          AllureHelper.label('testCaseId', C68960);
          AllureHelper.label('caseStatus', `${C68960.split(':')[0]}:not_reached`);
        } else if (submissionType === 'Text Entry') {
          AllureHelper.label('testCaseId', C68962);
          AllureHelper.label('caseStatus', `${C68962.split(':')[0]}:not_reached`);
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
          AllureHelper.label('caseStatus', `${C69038.split(':')[0]}:passed`);
        }
        if (assignmentConfig.rubric?.type === 'existing') {
          AllureHelper.label('caseStatus', `${C69039.split(':')[0]}:passed`);
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
          AllureHelper.label('caseStatus', `${C69060.split(':')[0]}:reached`);
        });

        await AllureHelper.step(`Submit assignment (${submissionType})`, async () => {
          await student.navigateToAssignmentDetails(uniqueTitle, courseName);
          if (submissionType === 'Text Entry') {
            await student.verifyFileTypeAndSubmit('Text Entry', undefined, getSubmissionText());
          } else {
            const filePath = getSubmissionFilePath(submissionFile);
            await student.verifyFileTypeAndSubmit(submissionType, filePath);
          }
          AllureHelper.label('caseStatus', `${C69061.split(':')[0]}:reached`);
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
        
        // 🎯 FIX: Added teacherEdits logic to match Canvas
        const teacherEdits = assignmentConfig.teacherEdits?.length
          ? { criteria: assignmentConfig.teacherEdits }
          : undefined;

        await AllureHelper.step('Run Grade & Workflow', async () => {
          console.log(`[${uniqueTitle}] 🚀 [START] Grade and Publish Workflow`);

          await runPGOrSkipOnTimeout(async () => {
            // 🎯 FIX: Passed teacherEdits as the 5th argument
           // await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail, baselineKey, teacherEdits);
           // Insert "moodle" as the 5th argument
          await executeUniversalPGWorkflow(
            pg,
            uniqueTitle,
            studentEmail,
            baselineKey,
            'moodle',
            teacherEdits,
            teacher,
            submissionType,
          );
          });

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
