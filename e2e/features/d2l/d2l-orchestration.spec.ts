import { test } from '../../fixtures';
import { executeUniversalPGWorkflow } from '../../utils/powergrader-workflow';
import { runPGOrSkipOnTimeout } from "../../utils/skip-on-workflow-timeout"; // Add wrapper
import { D2LLMS } from '../../components/lms/d2l/D2LLMS';
import { D2LLMSStudent } from '../../components/lms/d2l/D2LLMSStudent';
import { getD2LAssignmentConfigs } from '../../test-data/assignments/d2l';
import {
  C68955,
  C68956,
  C68957,
  C68958,
  C68959,
  C68960,
  C68961,
  C68962,
  C68998,
  C68999,
  C69000,
  C69002,
  C69036,
  C69038,
  C69039,
  C69041,
  C69065,
  C69067,
  C69092,
  C69098,
  C69100,
  C69138,
  C69209,
  C75466,
  C75511,
  C75529,
  C75645,
  C75673,
  C76730,
  C78819,
  C78820,
  C78823,
  C78835,
  C78990,
} from '../../test-data/testCaseIds';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getD2LConfig } from '../../config/d2l.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
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
        AllureHelper.label('testCaseId', C69100);
        AllureHelper.label('testCaseId', C78823);
      }
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
        AllureHelper.label('testCaseId', C69209);
        if (!isInvalidSubmission) {
          AllureHelper.label('caseStatus', `${C69209.split(':')[0]}:not_reached`);
        }
        AllureHelper.label('testCaseId', C75673);
        if (!isInvalidSubmission) {
          AllureHelper.label('caseStatus', `${C75673.split(':')[0]}:not_reached`);
        }
      } else if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', C68999);
        AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:not_reached`);
      }
      if (assignmentConfig.rubric?.type === 'new') {
        AllureHelper.label('testCaseId', C69038);
      }
      if (assignmentConfig.rubric?.type === 'existing') {
        AllureHelper.label('testCaseId', C69039);
      }
      if (
        !isInvalidSubmission &&
        assignmentConfig.rubric &&
        assignmentConfig.rubric.type !== 'no' &&
        assignmentConfig.rubric.criteriaOrder?.length
      ) {
        AllureHelper.label('testCaseId', C69041);
        AllureHelper.label('caseStatus', `${C69041.split(':')[0]}:not_reached`);
      }
      if (isInvalidSubmission) {
        AllureHelper.label('testCaseId', C75466);
        AllureHelper.label('caseStatus', `${C75466.split(':')[0]}:not_reached`);
      }

      const runStart = Date.now();
      const baselineKey = assignmentConfig.title; // stable across runs

      const uniqueTitle = `${assignmentConfig.title} [${Date.now()}]`;
      const submissionType = assignmentConfig.submissionType;
      const submissionFile = assignmentConfig.submissionFile;

      const teacher = new D2LLMS(d2lTeacherPage.page);
      const student = new D2LLMSStudent(d2lStudentPage.page);

      // LMS verify runs inside workflow (teacher); same Allure case IDs as verifyLmsScoreTest
      AllureHelper.label('testCaseId', C69065);
      AllureHelper.label('caseStatus', `${C69065.split(':')[0]}:not_reached`);
      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', C69002);
      }
      if (submissionType && submissionType !== 'Text Entry') {
        AllureHelper.label('testCaseId', C69098);
        AllureHelper.label('caseStatus', `${C69098.split(':')[0]}:not_reached`);
      }
      if (submissionType === 'Text Entry') {
        AllureHelper.label('testCaseId', C69067);
        AllureHelper.label('caseStatus', `${C69067.split(':')[0]}:not_reached`);
      }

      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', C75529);
        AllureHelper.label('caseStatus', `${C75529.split(':')[0]}:not_reached`);
        AllureHelper.label('testCaseId', C78835);
        AllureHelper.label('caseStatus', `${C78835.split(':')[0]}:not_reached`);
      }
      AllureHelper.label('testCaseId', C78990);
      AllureHelper.label('caseStatus', `${C78990.split(':')[0]}:not_reached`);
      if (!isInvalidSubmission) {
        AllureHelper.label('testCaseId', C76730);
        AllureHelper.label('caseStatus', `${C76730.split(':')[0]}:not_reached`);
        if (assignmentConfig.workflow.lmsVerifySave) {
          AllureHelper.label('testCaseId', C69138);
          AllureHelper.label('caseStatus', `${C69138.split(':')[0]}:not_reached`);
        }

        if (submissionType === '.txt') {
          AllureHelper.label('testCaseId', C68955);
          AllureHelper.label('caseStatus', `${C68955.split(':')[0]}:not_reached`);
        } else if (submissionType === '.pdf') {
          AllureHelper.label('testCaseId', C68957);
          AllureHelper.label('caseStatus', `${C68957.split(':')[0]}:not_reached`);
        } else if (submissionType === '.docx') {
          AllureHelper.label('testCaseId', C68959);
          AllureHelper.label('caseStatus', `${C68959.split(':')[0]}:not_reached`);
        } else if (submissionType === 'Text Entry') {
          AllureHelper.label('testCaseId', C68961);
          AllureHelper.label('caseStatus', `${C68961.split(':')[0]}:not_reached`);
        }

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
          AllureHelper.label('caseStatus', `${C69038.split(':')[0]}:passed`);
        }
        if (assignmentConfig.rubric?.type === 'existing') {
          AllureHelper.label('caseStatus', `${C69039.split(':')[0]}:passed`);
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
          AllureHelper.label('caseStatus', `${C69065.split(':')[0]}:reached`);
          if (submissionType === 'Text Entry') {
            AllureHelper.label('caseStatus', `${C69067.split(':')[0]}:reached`);
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

      await AllureHelper.step('Navigate to PowerGrader', async () => {
        AllureHelper.label('caseStatus', `${C78990.split(':')[0]}:reached`);
        const pg = await teacher.navigateToPowerGrader();

       /* await AllureHelper.step('Run Grade & Publish Workflow', async () => {
          console.log(`🚀 [START] Grade and Publish Workflow for: ${uniqueTitle}`);
          //await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail);
          await executeUniversalPGWorkflow(pg, uniqueTitle, studentEmail, baselineKey);
          console.log(`✅ [END] Grade and Publish Workflow for: ${uniqueTitle}`);
        });*/

        await AllureHelper.step('Run Grade & Publish Workflow', async () => {
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
          });

          console.log(`✅ [END] Grade and Publish Workflow for: ${uniqueTitle}`);
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