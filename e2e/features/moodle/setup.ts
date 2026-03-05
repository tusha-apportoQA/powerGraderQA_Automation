/**
 * Moodle LMS Setup
 * 
 * Simplified setup - no beforeAll hook needed.
 * Authentication happens on-demand in fixtures with test-level scope.
 * 
 * Usage: Import test and fixtures from this file instead of '../../fixtures'
 * Example: import { test, MoodleTeacherPage } from '../setup';
 */

import { test as baseTest } from '../../fixtures';

// Re-export fixtures for convenience
export { MoodleTeacherPage, MoodleStudentPage } from '../../fixtures';
export { expect } from '@playwright/test';

// Export the test object for use in Moodle test files
export const test = baseTest;

