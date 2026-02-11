/**
 * D2L Component Test: Create Assignment
 *
 * This test creates assignments in D2L using sample configs with index-based selection.
 * Similar to Canvas createAssignment flow, it uses the D2LLMS POM to handle the full flow.
 */

import { test } from '../setup';
import { D2LLMS } from '../../../components/lms/d2l/D2LLMS';
import { getD2LAssignmentConfigs } from '../../../test-data/assignments/d2l';
test.use({ headless: false });

test.describe('D2L Component Test: Create Assignment', () => {
    const sampleConfigs = getD2LAssignmentConfigs();
    const assignmentIndex = 9;

    test(`Create assignment from sample configs: Index ${assignmentIndex}`, async ({ d2lTeacherPage }) => {
        test.setTimeout(300000);

        if (assignmentIndex < 0 || assignmentIndex >= sampleConfigs.length) {
            throw new Error(`Invalid assignment index: ${assignmentIndex}. Must be between 0 and ${sampleConfigs.length - 1}`);
        }

        const config = sampleConfigs[assignmentIndex];
        if (!config) {
            throw new Error(`Assignment config not found at index ${assignmentIndex}`);
        }

        // Use course name from config if provided, otherwise D2LLMS will use default from D2L config
        const lms = new D2LLMS(d2lTeacherPage.page);
        
        console.log(`Creating assignment: ${config.title}`);
        console.log(`Submission Type: ${config.submissionType || 'N/A'}`);
        console.log(`Points: ${config.points || 'N/A'}`);

        // Create assignment using D2LLMS POM (similar to Canvas flow)
        await lms.createAssignment(config);
        
        console.log('✓ Assignment created successfully');
        
        // Extract assignment ID if needed
        try {
            const assignmentId = await lms.getAssignmentIdFromUrl();
            console.log(`✓ Assignment ID: ${assignmentId}`);
        } catch (error) {
            console.log('Note: Could not extract assignment ID from URL');
        }
    });
});


