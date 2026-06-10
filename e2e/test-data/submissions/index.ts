/**
 * Submission files and text content
 * Shared across all LMSs (Canvas, D2L, etc.)
 */

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
 * Get file path for a submission file declared on assignment config.
 * `submissionFile` is relative to e2e/test-data/submissions/files/
 * (e.g. "auto_submission_code_easy.py" or "files/auto_submission_code_easy.py").
 * @returns {string} Absolute path to the test file
 */
export function getSubmissionFilePath(submissionFile?: string | null): string {
    if (!submissionFile || submissionFile.trim() === '') {
        throw new Error('Missing submissionFile on assignment config');
    }
    const relativePath = submissionFile.replace(/^files\//, '');
    return path.resolve(getSubmissionFilesDir(), relativePath);
}

/**
 * Get submission text for Text Entry type
 * @returns {string} Test submission text content
 */
export function getSubmissionText(): string {
    return TEST_SUBMISSION_TEXT;
}
