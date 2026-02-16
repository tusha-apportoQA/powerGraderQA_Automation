//import { test } from '../../fixtures';
//import { Page } from '@playwright/test';
import { test, expect } from '../../fixtures'; // Add 'expect' here
import { Page } from '@playwright/test';
import { CanvasLMS } from '../../components/lms/canvas/CanvasLMS';
import { CanvasLMSStudent } from '../../components/lms/canvas/CanvasLMSStudent';
import { PowerGraderCoursePage } from '../../components/powergrader/pages/PowerGraderCoursePage';
import { PowerGraderAssignmentDetailsPage } from '../../components/powergrader/pages/PowerGraderAssignmentDetailsPage';
import { PowerGraderGradingPage } from '../../components/powergrader/pages/PowerGraderGradingPage';
import { getCanvasAssignmentConfigs } from '../../test-data/assignments/canvas';
import { getSubmissionFilePath, getSubmissionText } from '../../test-data/submissions';
import { getCanvasConfig } from '../../config/canvas.config';
import testUsers from '../../test_users';
import { AllureHelper } from '../../utils/allureHelper';
test.use({ headless: false });

test.describe('Canvas Orchestration @canvas @orchestration', () => {
    const allConfigs = getCanvasAssignmentConfigs();
    const ASSIGNMENT_CONFIGS = allConfigs.slice(0, 4);


    test.describe('Canvas LMS Teacher Orchestration [POW-413]', () => {
        test.describe.configure({ mode: 'parallel' });

        const studentUser = testUsers.find(user => user.role === 'student');
        if (!studentUser) {
            throw new Error('Student user not found in test users configuration');
        }
        const studentEmail = studentUser.username;

        for (const assignmentConfig of ASSIGNMENT_CONFIGS) {
            test.describe(`Assignment: ${assignmentConfig.title}`, () => {
                test.describe.configure({ mode: 'serial' });

                const timestamp = Date.now();
                const uniqueTitle = `${assignmentConfig.title} [${timestamp}]`;

                test(`Create assignment and setup rubric: ${assignmentConfig.title}`, async ({ canvasTeacherPage }) => {
                    test.setTimeout(300000);
                    
                    const uniqueConfig = { ...assignmentConfig, title: uniqueTitle };
                    
                    AllureHelper.label('Test Type', 'Assignment Creation');
                    AllureHelper.label('LMS', 'Canvas');
                    AllureHelper.label('Role', 'Teacher');
                    AllureHelper.label('Assignment', uniqueTitle);
                    AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');
                    AllureHelper.label('Rubric Type', assignmentConfig.rubric?.type || 'N/A');

                    const lms = new CanvasLMS(canvasTeacherPage.page);
                    //let powerGraderPage: Page;
                    
                    await AllureHelper.step('Create assignment in Canvas', async () => {
                        await lms.createAssignment(uniqueConfig);
                        await AllureHelper.attachScreenshot(canvasTeacherPage.page, 'Assignment Created');
                    });
                });

                if (!assignmentConfig.submissionType) {
                    test(`Submit for: ${assignmentConfig.title}`, async () => {
                        test.skip(true, `Submission type not defined for: ${assignmentConfig.title}`);
                    });
                } else {
                    test(`Submit ${assignmentConfig.submissionType} for: ${assignmentConfig.title}`, async ({ canvasStudentPage }) => {
                        test.setTimeout(300000);
                        
                        AllureHelper.label('Test Type', 'Student Submission');
                        AllureHelper.label('LMS', 'Canvas');
                        AllureHelper.label('Role', 'Student');
                        AllureHelper.label('Assignment', uniqueTitle);
                        AllureHelper.label('Submission Type', assignmentConfig.submissionType || 'N/A');

                        const lms = new CanvasLMSStudent(canvasStudentPage.page);
                        const { courseName } = getCanvasConfig();

                        await AllureHelper.step('Navigate to Canvas dashboard', async () => {
                            await lms.dashboardPage.goto(lms.baseURL);
                            await lms.dashboardPage.expectDashboardLoaded();
                        });

                        await AllureHelper.step('Select course and navigate to assignments', async () => {
                            await lms.dashboardPage.selectCourse(courseName);
                            await lms.coursePage.expectCoursePageLoaded();
                            await lms.coursePage.clickAssignments();
                            await lms.assignmentListPage.expectAssignmentsListLoaded();
                        });

                        await AllureHelper.step('Open assignment details', async () => {
                            await lms.assignmentListPage.clickAssignment(uniqueTitle);
                            await lms.assignmentDetailsPage.expectAssignmentDetailsLoaded();
                            await lms.assignmentDetailsPage.verifyAssignmentTitle(uniqueTitle);
                            await AllureHelper.attachScreenshot(canvasStudentPage.page, 'Assignment Details Page');
                        });

                        await AllureHelper.step('Submit assignment', async () => {
                            const submissionType = assignmentConfig.submissionType!;
                            
                            if (submissionType === 'Text Entry') {
                                const submissionText = getSubmissionText();
                                await lms.verifyFileTypeAndSubmit(submissionType, undefined, submissionText);
                            } else {
                                // 1. Try resolving with the original '.docx' (exactly as defined in your config)
                                let filePath = getSubmissionFilePath(submissionType as any);

                                // 2. Fallback: If that fails, try stripping the dot
                                if (!filePath && submissionType.startsWith('.')) {
                                    const strippedKey = submissionType.substring(1);
                                    filePath = getSubmissionFilePath(strippedKey as any);
                                }
                                // 3. Final Check
                                if (!filePath) {
                                    throw new Error(`Critical: Could not find a local file for submission type "${submissionType}". 
                                    Check if the file exists in your test-data folder.`);
                                }
                                console.log(`[Submission] Successfully resolved file: ${filePath}`);
                                await lms.verifyFileTypeAndSubmit(submissionType, filePath);
                            }
                            await AllureHelper.attachScreenshot(canvasStudentPage.page, 'Submission Complete');
                        });
                    });
                }

                    //Update by Tusha
                    test(`Grade and publish for: ${assignmentConfig.title}`, async ({ canvasTeacherPage }) => {
                        test.setTimeout(900000);
    
                        AllureHelper.label('Test Type', 'Grade and Publish');
                        AllureHelper.label('LMS', 'Canvas');
                        AllureHelper.label('Role', 'Teacher');
                        AllureHelper.label('Assignment', uniqueTitle);
                        AllureHelper.label('Student Email', studentEmail);

                        const lms = new CanvasLMS(canvasTeacherPage.page);
                        let powerGraderPage: Page; // Declared here so all steps can access it

                        await AllureHelper.step('Wait for PowerGrader Sync (Assignment & Student)', async () => {
                            const startTime = Date.now();
                            const MAX_WAIT = 8 * 60 * 1000; 
                            const INTERVAL = 30 * 1000;    
                            let isAssignmentFound = false;

                            const lms = new CanvasLMS(canvasTeacherPage.page);
                            //let powerGraderPage: Page;

                            while (Date.now() - startTime < MAX_WAIT) {
                                console.log(`[${uniqueTitle}] Course Page Sync: Checking for assignment...`);
                                try {
                                    if (!powerGraderPage) {
                                        await lms.navigateToCourse();
                                        powerGraderPage = await lms.navigateToPowerGrader(); 
                                    } else {
                                        await powerGraderPage.reload({ waitUntil: 'networkidle' });
                                    }
                                    
                                    const powerGraderCoursePage = new PowerGraderCoursePage(powerGraderPage);
                                    await powerGraderCoursePage.waitForLoad();
                                    
                                    // Locate the specific assignment row
                                    const assignmentRow = powerGraderPage.locator('tr, div[role="row"]').filter({ hasText: uniqueTitle }).last();
                                    const rowCount = await assignmentRow.count();
                                    console.log(`[${uniqueTitle}] Debug: Found ${rowCount} potential rows for title.`);
                                   if (await assignmentRow.isVisible()) {
                                        console.log(`[${uniqueTitle}] Assignment found. Clicking on "View"...`);
                                        const studentViewButton = assignmentRow.getByText('View', { exact: true }).first();
                                        const viewButtonFound = await studentViewButton.isVisible({ timeout: 10000 }).catch(() => false);
                                         if (viewButtonFound) {
                                            console.log(`[${uniqueTitle}] Assignment View button found, opening submission...`);
                                            studentViewButton.click();
                                            isAssignmentFound = true;
                                            break;
                                        } else {
                                            console.log(`[${uniqueTitle}] Student View button not found in PowerGrader`);
                                            await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Sync Failed');
                                            throw new Error('Student View button not found in PowerGrader');
                                        }
                                    }
                                } catch (e) {
                                    console.log(`[${uniqueTitle}] Syncing... waiting for assignment to appear on Course Page.`);
                                }
                                await new Promise(res => setTimeout(res, INTERVAL));
                            }

                            if (!isAssignmentFound) throw new Error("Assignment never appeared on Course Page.");

                            // PHASE 2: Wait for Student on the Details Page
                            console.log(`[${uniqueTitle}] Waiting for student submission to sync on Details Page...`);
                            const powerGraderAssignmentDetailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
                        
                            // PHASE 2: Wait for Student on the Details Page
                            console.log(`[${uniqueTitle}] Starting Details Page Sync...`);
                            await expect(async () => {
                                console.log(`[${uniqueTitle}] Details Page Sync: Reloading...`);
                                await powerGraderPage.reload({ waitUntil: 'networkidle' });
                                
                                // 1. Detect and click the blocker if it's there
                                const generateBtn = powerGraderPage.locator('button').filter({ hasText: "Generate Compatible Rubric" });
                                if (await generateBtn.isVisible()) {
                                    console.log(`[${uniqueTitle}] No Rubric banner found. Clicking Generate...`);
                                    await generateBtn.click();
                                    await expect(generateBtn).not.toBeVisible({ timeout: 15000 });
                                    console.log(`[${uniqueTitle}] Triggered rubric generation, waiting for AI Grading to complete...'..`);
                                    throw new Error('Triggered rubric generation, waiting for AI...'); // Force retry
                                }

                                // 2. Poll for the final result
                                const startReviewingBtn = powerGraderPage.locator('button').filter({ hasText: /^Start Reviewing$/i });

                                if (await startReviewingBtn.isVisible({ timeout: 10000 })) {
                                    console.log(`[${uniqueTitle}] AI Grading cycle complete. Clicking "Start Reviewing"...`);
                                    await startReviewingBtn.click(); // Navigates to Grading Page
                                } else {
                                    throw new Error('Waiting for "Start Reviewing" button to appear...');
                                }
                            }).toPass({ intervals: [30000], timeout: 600000 });

                            console.log(`✅ AI Grading cycle complete. 'View' button found for ${studentEmail}.`);

                            const durationMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                            console.log(`✅ Total Sync successful after ${durationMinutes} minutes.`);
                            AllureHelper.label('Sync Duration', `${durationMinutes} min`);
                        });
                        await AllureHelper.step('Verify AI Results and Publish', async () => {
                            const gradingPage = new PowerGraderGradingPage(powerGraderPage);
                            await gradingPage.waitForLoad();
                            
                            // This method now handles verification and logs the score once
                            await gradingPage.verifyGradesAndFeedbackPopulated();
                            
                            const finalScore = await gradingPage.getTotalScore();
                            console.log(`[${uniqueTitle}] AI Grade Verified. Final Score: ${finalScore}`);
                            
                            await gradingPage.clickPublishButton();
                        });
                        // DELETE THE NEXT STEP "Publish grades" COMPLETELY

                        /*await AllureHelper.step('Publish grades', async () => {
                            const powerGraderGradingPage = new PowerGraderGradingPage(powerGraderPage);
                            await powerGraderGradingPage.waitForLoad();
                            await powerGraderGradingPage.expectPageLoaded();
                            //If the config is "no rubric", handle the generation first
                            if (assignmentConfig.rubric?.type === 'no') {
                                // You would call the method we added to the Grading Page Object here:
                                // await powerGraderGradingPage.handleNoRubricFlow(); 
                                
                                // Manual inline fix if you haven't updated the Page Object yet:
                                const generateBtn = powerGraderPage.getByRole('button', { name: /Generate Compatible Rubric/i });
                                if (await generateBtn.isVisible()) {
                                    await generateBtn.click();
                                    await powerGraderPage.locator('.rubric-container').waitFor({ state: 'visible', timeout: 180000 });
                                }
                            }
                            
                            // Safety Gate: Ensure AI results are populated
                            await powerGraderGradingPage.verifyGradesAndFeedbackPopulated();
                            
                            const finalScore = await powerGraderGradingPage.getTotalScore();
                            console.log(`[${uniqueTitle}] AI Verified. Final Score: ${finalScore}`);
                            
                            await AllureHelper.attachScreenshot(powerGraderPage, 'Ready to Publish');
                            //await powerGraderGradingPage.verifyGradesAndFeedbackPopulated();
                            await powerGraderGradingPage.clickPublishButton();
                            await AllureHelper.attachScreenshot(powerGraderPage, 'Published');
                        });*/

                    /*await AllureHelper.step('Check for student View button and open submission', async () => {
                        const powerGraderAssignmentDetailsPage = new PowerGraderAssignmentDetailsPage(powerGraderPage);
                        await powerGraderAssignmentDetailsPage.waitForLoad();
                        await powerGraderAssignmentDetailsPage.expectPageLoaded(uniqueTitle);
                        
                        const studentEmailText = powerGraderPage.getByText(studentEmail, { exact: false }).first();
                        const isStudentVisible = await studentEmailText.isVisible({ timeout: 5000 }).catch(() => false);
                        
                        if (isStudentVisible) {
                            const studentRow = studentEmailText.locator('xpath=ancestor::tr').first();
                            const studentViewButton = studentRow.getByText('View', { exact: true }).first();
                            const viewButtonFound = await studentViewButton.isVisible({ timeout: 5000 }).catch(() => false);
                            
                            if (viewButtonFound) {
                                console.log(`[${uniqueTitle}] Student View button found, opening submission...`);
                                await powerGraderAssignmentDetailsPage.clickViewButtonForStudent(studentEmail);
                            } else {
                                console.log(`[${uniqueTitle}] Student View button not found in PowerGrader`);
                                await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Sync Failed');
                                throw new Error('Student View button not found in PowerGrader');
                            }
                        } else {
                            console.log(`[${uniqueTitle}] Student not visible in PowerGrader`);
                            await AllureHelper.attachScreenshot(powerGraderPage, 'PowerGrader Sync Failed');
                            throw new Error('Student not visible in PowerGrader assignment details');
                        }
                    });*/

                    /*await AllureHelper.step('Publish grades', async () => {
                        const powerGraderGradingPage = new PowerGraderGradingPage(powerGraderPage);
                        await powerGraderGradingPage.waitForLoad();
                        await powerGraderGradingPage.expectPageLoaded();
                        await AllureHelper.attachScreenshot(powerGraderPage, 'Grading Page Before Publish');
                        await powerGraderGradingPage.clickPublishButton();
                        await AllureHelper.attachScreenshot(powerGraderPage, 'Grading Page After Publish');
                    });*/

                    
                   
                });
            });
        }
    });
});
