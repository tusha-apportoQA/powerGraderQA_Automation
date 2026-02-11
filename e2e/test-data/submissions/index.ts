/**
 * Submission files and text content
 * Shared across all LMSs (Canvas, D2L, etc.)
 */

import { FormatType } from '../../types';
import * as path from 'path';
import { TEST_SUBMISSION_TEXT } from './text';

/**
 * Get the path to the submission files directory
 * Works in both local development and CI/CD environments
 * Handles both compiled (dist/) and source (e2e/) locations
 */
function getSubmissionFilesDir(): string {
    const currentDir = __dirname;
    
    // Check if we're in dist/ (compiled) or e2e/ (source)
    if (currentDir.includes('dist')) {
        // Compiled: dist/test-data/submissions/ -> go up to project root, then to e2e/test-data/submissions/files/
        const projectRoot = path.resolve(currentDir, '..', '..', '..');
        return path.resolve(projectRoot, 'e2e', 'test-data', 'submissions', 'files');
    } else {
        // Source: e2e/test-data/submissions/ -> go to files/
        return path.resolve(currentDir, 'files');
    }
}

/**
 * Re-export text submission content
 */
export { TEST_SUBMISSION_TEXT } from './text';

/**
 * File paths for test submission files (absolute paths)
 * Files should be placed in: e2e/test-data/submissions/files/
 * This approach works in both local development and CI/CD environments
 * Handles both compiled (dist/) and source (e2e/) execution contexts
 */
const filesDir = getSubmissionFilesDir();
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

