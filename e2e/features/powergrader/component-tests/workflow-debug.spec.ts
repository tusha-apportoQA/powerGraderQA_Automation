import { test } from '../../../fixtures';
import { executeUniversalPGWorkflow } from '../../../utils/powergrader-workflow';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { D2LLMS } from '../../../components/lms/d2l/D2LLMS';
import { MoodleLMS } from '../../../components/lms/moodle/MoodleLMS';
import { getCanvasAssignmentConfigs } from '../../../test-data/assignments/canvas';
import { getD2LAssignmentConfigs } from '../../../test-data/assignments/d2l';
import { getMoodleAssignmentConfigs } from '../../../test-data/assignments/moodle';
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
} from '../../../test-data/testCaseIds';
import testUsers from '../../../test_users';
import { AllureHelper } from '../../../utils/allureHelper';
import { runPGOrSkipOnTimeout } from '../../../utils/skip-on-workflow-timeout';

/**
 * Debug: skip create/submit, run PG workflow on an existing assignment.
 * DEBUG_LMS — 'canvas' | 'd2l' | 'moodle' (only affects which LMS launches PowerGrader)
 * ASSIGNMENT_CONFIG_INDEX — index in that LMS config list
 * TITLE_SUFFIX — e.g. "1781701234002" from "Canvas ELC Poor docx [1781701234002]"
 */
const DEBUG_LMS = 'd2l' as 'canvas' | 'd2l' | 'moodle';
const ASSIGNMENT_CONFIG_INDEX = 5;
const TITLE_SUFFIX = '1782838139776';

test.use({ headless: false });

// Only the matching teacher fixture is registered below so Playwright authenticates one LMS.
test.describe(`Component Test: PG workflow debug @${DEBUG_LMS} @debug`, () => {
  const allConfigs =
    DEBUG_LMS === 'canvas'
      ? getCanvasAssignmentConfigs()
      : DEBUG_LMS === 'd2l'
        ? getD2LAssignmentConfigs()
        : getMoodleAssignmentConfigs();

  const assignmentConfig = allConfigs[ASSIGNMENT_CONFIG_INDEX];
  if (!assignmentConfig) {
    throw new Error(`Invalid ASSIGNMENT_CONFIG_INDEX: ${ASSIGNMENT_CONFIG_INDEX}`);
  }

  const uniqueTitle = `${assignmentConfig.title} [${TITLE_SUFFIX}]`;
  const submissionType = assignmentConfig.submissionType;

  const studentUser =
    DEBUG_LMS === 'd2l'
      ? testUsers.find(u => u.role === 'student' && u.lms === 'd2l')
      : testUsers.find(u => u.role === 'student');
  if (!studentUser) throw new Error('Student user not found');
  const studentEmail = studentUser.username;

  async function runWorkflow(teacher: CanvasLMS | D2LLMS | MoodleLMS) {
    AllureHelper.label('lms', DEBUG_LMS);
    AllureHelper.label('caseConfig', `${DEBUG_LMS}|workflow-debug|${assignmentConfig.title}`);

    const isInvalidSubmission = !!assignmentConfig.workflow.invalidSubmission;

    AllureHelper.label('testCaseId', POW913);
    if (!isInvalidSubmission) {
      AllureHelper.label('testCaseId', POW998);
      AllureHelper.label('testCaseId', POW944);
    }
    if (submissionType === 'Text Entry') AllureHelper.label('testCaseId', POW920);
    if (submissionType === '.docx') AllureHelper.label('testCaseId', POW931);
    if (submissionType === '.csv' || submissionType === '.xlsx') {
      AllureHelper.label('testCaseId', POW942);
      AllureHelper.label('caseStatus', `${POW942.split(':')[0]}:not_reached`);
    }
    if (assignmentConfig.teacherEdits?.length) AllureHelper.label('testCaseId', POW937);
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
    if (assignmentConfig.rubric?.type === 'existing') AllureHelper.label('testCaseId', POW1008);
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

    console.log(`\n===== START (${DEBUG_LMS} debug, skip create/submit): ${uniqueTitle} =====`);

    const gradeStart = Date.now();
    await AllureHelper.step('Navigate to course (teacher)', async () => {
      await teacher.navigateToCourse();
    });

    await AllureHelper.step('Navigate to PowerGrader', async () => {
      AllureHelper.label('caseStatus', `${POW949.split(':')[0]}:reached`);
      const pg = await teacher.navigateToPowerGrader();

      await AllureHelper.step('Run Grade & Publish Workflow', async () => {
        console.log(`[${uniqueTitle}] 🚀 [START] Grade and Publish Workflow`);

        await runPGOrSkipOnTimeout(async () => {
          await executeUniversalPGWorkflow(
            pg,
            uniqueTitle,
            studentEmail,
            assignmentConfig,
            DEBUG_LMS,
            teacher,
          );
        }, pg);

        console.log(`[${uniqueTitle}] ✅ [END] Grade and Publish Workflow`);
      });
    });

    const gradeMs = Date.now() - gradeStart;
    AllureHelper.parameter('Grade time', `${(gradeMs / 1000).toFixed(1)}s`);
  }

  if (DEBUG_LMS === 'canvas') {
    test('Run PG workflow on existing assignment', async ({ canvasTeacherPage }) => {
      test.setTimeout(2_400_000);
      await runWorkflow(new CanvasLMS(canvasTeacherPage.page));
    });
  } else if (DEBUG_LMS === 'd2l') {
    test('Run PG workflow on existing assignment', async ({ d2lTeacherPage }) => {
      test.setTimeout(2_400_000);
      await runWorkflow(new D2LLMS(d2lTeacherPage.page));
    });
  } else {
    test('Run PG workflow on existing assignment', async ({ moodleTeacherPage }) => {
      test.setTimeout(2_400_000);
      await runWorkflow(new MoodleLMS(moodleTeacherPage.page));
    });
  }
});
