/**
 * Centralized test data constants
 * This file contains all test data constants (text content, file paths, rubrics, etc.)
 * For test files (PDF, DOCX, TXT, images), see: test-data/files/
 */

import { FormatType, ExistingRubricConfig, NewRubricConfig, AssignmentConfig } from '../types';
import * as path from 'path';

/**
 * Get the path to the test data files directory
 * Works in both local development and CI/CD environments
 * Handles both compiled (dist/) and source (e2e/) locations
 */
function getTestDataFilesDir(): string {
    // __dirname points to the directory containing this file
    // If compiled: dist/test-data/ -> go up to project root, then to e2e/test-data/files/
    // If running from source: e2e/test-data/ -> go to files/
    
    const currentDir = __dirname;
    
    // Check if we're in dist/ (compiled) or e2e/ (source)
    if (currentDir.includes('dist')) {
        // Compiled: dist/test-data/ -> go up to project root, then to e2e/test-data/files/
        const projectRoot = path.resolve(currentDir, '..', '..');
        return path.resolve(projectRoot, 'e2e', 'test-data', 'files');
    } else {
        // Source: e2e/test-data/ -> go to files/
        return path.resolve(currentDir, 'files');
    }
}

/**
 * Test submission text content for Text Entry submissions
 */
export const TEST_SUBMISSION_TEXT = `This is a test submission for the assignment.

I am writing about the impact of technology in daily life. Technology has both positive and negative aspects.

Positive aspects:
- Improved communication and connectivity
- Enhanced productivity and efficiency
- Access to vast amounts of information
- Automation of repetitive tasks

Negative aspects:
- Privacy concerns and data security issues
- Over-reliance on technology
- Digital divide and accessibility challenges
- Potential for social isolation

In my personal experience, technology has significantly improved my ability to learn and work efficiently, but I also recognize the importance of maintaining a healthy balance between digital and real-world interactions.`;

/**
 * File paths for test submission files (absolute paths)
 * Files should be placed in: e2e/test-data/files/
 * This approach works in both local development and CI/CD environments
 * Handles both compiled (dist/) and source (e2e/) execution contexts
 */
const filesDir = getTestDataFilesDir();
export const TEST_SUBMISSION_FILES = {
    '.pdf': path.resolve(filesDir, 'test-submission.pdf'),
    '.docx': path.resolve(filesDir, 'test-submission.docx'),
    '.txt': path.resolve(filesDir, 'test-submission.txt')
} as const;

/**
 * Get file path for a given submission type
 * @param submissionType - The submission format type
 * @returns {string} Absolute path to the test file
 */
export function getSubmissionFilePath(submissionType: FormatType): string {
    if (submissionType === 'Text Entry') {
        throw new Error('Text Entry does not require a file path. Use getSubmissionText() instead.');
    }
    return TEST_SUBMISSION_FILES[submissionType];
}

/**
 * Get submission text for Text Entry type
 * @returns {string} Test submission text content
 */
export function getSubmissionText(): string {
    return TEST_SUBMISSION_TEXT;
}

/**
 * Predefined existing rubric configurations
 * These rubrics should already exist in Canvas
 */
export const EXISTING_RUBRICS: ExistingRubricConfig[] = [
    {
        type: 'existing',
        groupName: 'Powergrader',
        rubricName: 'Some rubric (3)'
    }
    // Add more existing rubrics as needed
];

/**
 * Predefined new rubric configurations
 * These rubrics will be created during test execution
 */
export const NEW_RUBRICS: NewRubricConfig[] = [
    {
        type: 'new',
        title: 'Essay Grading Rubric',
        criteria: [
            {
                description: 'Content Quality',
                longDescription: 'Depth and accuracy of content',
                maxPoints: 10,
                ratings: [
                    { points: 10, description: 'Excellent', longDescription: 'Comprehensive and accurate' },
                    { points: 7, description: 'Good', longDescription: 'Mostly accurate with minor gaps' },
                    { points: 4, description: 'Fair', longDescription: 'Some inaccuracies present' },
                    { points: 0, description: 'Poor', longDescription: 'Significant inaccuracies' }
                ]
            },
            {
                description: 'Grammar and Style',
                maxPoints: 5,
                ratings: [
                    { points: 5, description: 'Perfect' },
                    { points: 3, description: 'Good' },
                    { points: 0, description: 'Needs improvement' }
                ]
            }
        ]
    },
    {
        type: 'new',
        title: 'Technology Impact Assessment Rubric',
        criteria: [
            {
                description: 'Analysis Depth',
                longDescription: 'Thoroughness of analysis on technology impact',
                maxPoints: 15,
                ratings: [
                    { points: 15, description: 'Excellent', longDescription: 'Deep, comprehensive analysis with multiple perspectives' },
                    { points: 10, description: 'Good', longDescription: 'Solid analysis covering main points' },
                    { points: 5, description: 'Fair', longDescription: 'Basic analysis with limited depth' },
                    { points: 0, description: 'Poor', longDescription: 'Superficial or missing analysis' }
                ]
            },
            {
                description: 'Personal Examples',
                maxPoints: 10,
                ratings: [
                    { points: 10, description: 'Excellent', longDescription: 'Relevant, detailed personal examples' },
                    { points: 6, description: 'Good', longDescription: 'Some relevant examples provided' },
                    { points: 3, description: 'Fair', longDescription: 'Limited or vague examples' },
                    { points: 0, description: 'Poor', longDescription: 'No examples or irrelevant examples' }
                ]
            },
            {
                description: 'Writing Quality',
                maxPoints: 5,
                ratings: [
                    { points: 5, description: 'Excellent', longDescription: 'Clear, well-structured writing' },
                    { points: 3, description: 'Good', longDescription: 'Generally clear with minor issues' },
                    { points: 1, description: 'Fair', longDescription: 'Some clarity issues' },
                    { points: 0, description: 'Poor', longDescription: 'Unclear or poorly structured' }
                ]
            }
        ]
    }
    // Add more new rubric templates as needed
];

/**
 * Get an existing rubric by index
 * @param index - Index in the EXISTING_RUBRICS array (default: 0)
 * @returns {ExistingRubricConfig} Existing rubric configuration
 */
export function getExistingRubric(index: number = 0): ExistingRubricConfig {
    if (index < 0 || index >= EXISTING_RUBRICS.length) {
        throw new Error(`Invalid rubric index: ${index}. Available rubrics: 0-${EXISTING_RUBRICS.length - 1}`);
    }
    return EXISTING_RUBRICS[index];
}

/**
 * Get a new rubric by index
 * @param index - Index in the NEW_RUBRICS array (default: 0)
 * @returns {NewRubricConfig} New rubric configuration
 */
export function getNewRubric(index: number = 0): NewRubricConfig {
    if (index < 0 || index >= NEW_RUBRICS.length) {
        throw new Error(`Invalid rubric index: ${index}. Available rubrics: 0-${NEW_RUBRICS.length - 1}`);
    }
    return NEW_RUBRICS[index];
}


