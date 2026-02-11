import { test } from './setup';
import { D2LLMS } from '../../components/lms/d2l/D2LLMS';
import { D2LLMSStudent } from '../../components/lms/d2l/D2LLMSStudent';
import { getD2LAssignmentConfigs } from '../../test-data/assignments/d2l';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getD2LConfig } from '../../config/d2l.config';
import { AllureHelper } from '../../utils/allureHelper';

test.use({ headless: false });

test.describe('D2L LMS Teacher Student Orchestration [POW-471] @d2l', () => {
    // Get all assignment configs
    const allConfigs = getD2LAssignmentConfigs();
    const ASSIGNMENT_CONFIGS = allConfigs;
    const BATCH_SIZE = 4;

    // Step 1: Create all assignments in batches of 4 (parallel execution within each batch)
    test.describe('Step 1: LMS Orchestration - Create Assignments', () => {
        // Process assignments in batches of 4
        for (let i = 0; i < ASSIGNMENT_CONFIGS.length; i += BATCH_SIZE) {
            const batch = ASSIGNMENT_CONFIGS.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(ASSIGNMENT_CONFIGS.length / BATCH_SIZE);

            test.describe(`Batch ${batchNumber}/${totalBatches} (${batch.length} assignments)`, () => {
                test.describe.configure({ mode: 'parallel' });

                for (const assignmentConfig of batch) {
                    test(`Create assignment and setup rubric: ${assignmentConfig.title}`, async ({ d2lTeacherPage }) => {
                        test.setTimeout(300000);
                        
                        AllureHelper.label('Test Type', 'Assignment Creation');
                        AllureHelper.label('LMS', 'D2L');
                        AllureHelper.label('Role', 'Teacher');
                        AllureHelper.label('Assignment', assignmentConfig.title);
                        AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');
                        AllureHelper.label('Rubric Type', assignmentConfig.rubric?.type || 'N/A');
                        AllureHelper.label('Batch', `${batchNumber}/${totalBatches}`);

                        const lms = new D2LLMS(d2lTeacherPage.page);
                        
                        await AllureHelper.step('Create assignment in D2L', async () => {
                            await lms.createAssignment(assignmentConfig);
                            await AllureHelper.attachScreenshot(d2lTeacherPage.page, 'Assignment Created');
                        });
                    });
                }
            });
        }
    });

    // Step 2: Student Submissions (runs after all assignments are created)
    // Uses assignment configs directly, assuming all assignments are already created
    // Set to serial mode to ensure Step 1 completes before Step 2 starts
    test.describe('Step 2: Student Submissions', () => {
        test.describe.configure({ mode: 'serial' });

        for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
            if (!assignmentConfig.submissionType) {
                test(`Submit for: ${assignmentConfig.title}`, async () => {
                    test.skip(true, `Submission type not defined for: ${assignmentConfig.title}`);
                });
                continue;
            }

            test(`Submit ${assignmentConfig.submissionType} for: ${assignmentConfig.title}`, async ({ d2lStudentPage }) => {
                test.setTimeout(300000);
                
                AllureHelper.label('Test Type', 'Student Submission');
                AllureHelper.label('LMS', 'D2L');
                AllureHelper.label('Role', 'Student');
                AllureHelper.label('Assignment', assignmentConfig.title);
                AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');

                const lms = new D2LLMSStudent(d2lStudentPage.page);
                const { courseName } = getD2LConfig();

                await AllureHelper.step('Navigate to D2L dashboard', async () => {
                    await lms.dashboardPage.goto(lms.baseURL);
                    await lms.dashboardPage.expectDashboardLoaded();
                });

                await AllureHelper.step('Select course and navigate to assignments', async () => {
                    await lms.dashboardPage.selectCourse(courseName);
                    await lms.coursePage.expectCoursePageLoaded();
                    await lms.coursePage.clickAssignments();
                    await lms.assignmentListPage.expectAssignmentListPageLoaded();
                });

                await AllureHelper.step('Open assignment and submit', async () => {
                    await lms.assignmentListPage.clickAssignment(assignmentConfig.title);
                    await AllureHelper.attachScreenshot(d2lStudentPage.page, 'Assignment Submission Page');
                });

                await AllureHelper.step('Submit assignment', async () => {
                    const submissionType = assignmentConfig.submissionType;
                    if (submissionType === 'Text Entry') {
                        const submissionText = getSubmissionText();
                        await lms.verifyFileTypeAndSubmit(assignmentConfig.title, submissionType, undefined, submissionText);
                    } else if (submissionType) {
                        const filePath = getSubmissionFilePath(submissionType);
                        await lms.verifyFileTypeAndSubmit(assignmentConfig.title, submissionType, filePath);
                    } else {
                        throw new Error(`Submission type is required for assignment: ${assignmentConfig.title}`);
                    }
                    await AllureHelper.attachScreenshot(d2lStudentPage.page, 'Submission Complete');
                });
            });
        }
    });
});

