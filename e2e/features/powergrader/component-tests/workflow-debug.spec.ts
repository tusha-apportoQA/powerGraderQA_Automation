import { test } from '../../../fixtures';
import { executeUniversalPGWorkflow } from '../../../utils/powergrader-workflow';
import { CanvasLMS } from '../../../components/lms/canvas/CanvasLMS';
import { D2LLMS } from '../../../components/lms/d2l/D2LLMS';
import { MoodleLMS } from '../../../components/lms/moodle/MoodleLMS';
import { getCanvasAssignmentConfigs } from '../../../test-data/assignments/canvas';
import { getD2LAssignmentConfigs } from '../../../test-data/assignments/d2l';
import { getMoodleAssignmentConfigs } from '../../../test-data/assignments/moodle';
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
const DEBUG_LMS = 'canvas' as 'canvas' | 'd2l' | 'moodle';
const ASSIGNMENT_CONFIG_INDEX = 0;
const TITLE_SUFFIX = '1781790696917';

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

  const baselineKey = assignmentConfig.title;
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
    AllureHelper.label('testCaseId', C69074);
    AllureHelper.label('testCaseId', C69100);
    AllureHelper.label('testCaseId', C78823);
    if (submissionType === 'Text Entry') AllureHelper.label('testCaseId', C69092);
    if (submissionType === '.docx') AllureHelper.label('testCaseId', C75645);
    if (submissionType === '.csv' || submissionType === '.xlsx') {
      AllureHelper.label('testCaseId', C78819);
      AllureHelper.label('caseStatus', `${C78819.split(':')[0]}:not_reached`);
      AllureHelper.label('testCaseId', C78820);
      AllureHelper.label('caseStatus', `${C78820.split(':')[0]}:not_reached`);
    }
    if (assignmentConfig.teacherEdits?.length) AllureHelper.label('testCaseId', C75511);
    if (assignmentConfig.rubric?.type === 'no') {
      AllureHelper.label('testCaseId', C69036);
      AllureHelper.label('testCaseId', C68998);
      AllureHelper.label('testCaseId', C69000);
    } else {
      AllureHelper.label('testCaseId', C68999);
      AllureHelper.label('caseStatus', `${C68999.split(':')[0]}:not_reached`);
    }
    if (assignmentConfig.rubric?.type === 'new') AllureHelper.label('testCaseId', C69038);
    if (assignmentConfig.rubric?.type === 'existing') AllureHelper.label('testCaseId', C69039);

    AllureHelper.label('testCaseId', C69070);
    AllureHelper.label('caseStatus', `${C69070.split(':')[0]}:not_reached`);
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

    console.log(`\n===== START (${DEBUG_LMS} debug, skip create/submit): ${uniqueTitle} =====`);

    const gradeStart = Date.now();
    await AllureHelper.step('Navigate to course (teacher)', async () => {
      await teacher.navigateToCourse();
    });

    await AllureHelper.step('Navigate to PowerGrader', async () => {
      const pg = await teacher.navigateToPowerGrader();

      const teacherEdits = assignmentConfig.teacherEdits?.length
        ? { criteria: assignmentConfig.teacherEdits }
        : undefined;

      await AllureHelper.step('Run Grade & Publish Workflow', async () => {
        console.log(`[${uniqueTitle}] 🚀 [START] Grade and Publish Workflow`);

        await runPGOrSkipOnTimeout(async () => {
          await executeUniversalPGWorkflow(
            pg,
            uniqueTitle,
            studentEmail,
            baselineKey,
            DEBUG_LMS,
            teacherEdits,
            teacher,
            submissionType,
          );
        });

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
