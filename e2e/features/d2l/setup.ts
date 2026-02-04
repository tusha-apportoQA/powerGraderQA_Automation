/**
 * D2L LMS Setup
 * 
 * Simplified setup - no beforeAll hook needed.
 * Authentication happens on-demand in fixtures with 15-minute expiration check.
 * 
 * Usage: Import test and fixtures from this file instead of '../../fixtures'
 * Example: import { test, D2LTeacherPage } from '../setup';
 */

import { test as baseTest } from '../../fixtures';

// Re-export fixtures for convenience
export { D2LTeacherPage, D2LStudentPage } from '../../fixtures';
export { expect } from '@playwright/test';

// Export the test object for use in D2L test files
export const test = baseTest;
