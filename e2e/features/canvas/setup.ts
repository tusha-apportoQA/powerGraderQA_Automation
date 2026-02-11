/**
 * Canvas LMS Setup
 * 
 * This setup runs before all tests in the canvas folder.
 * It ensures Canvas users are authenticated and storage states are created.
 * 
 * This setup only runs when tests inside the canvas features folder are executed.
 * 
 * Usage: Import test and fixtures from this file instead of '../../fixtures'
 * Example: import { test, CanvasTeacherPage } from '../setup';
 */

import { test as baseTest, chromium } from '@playwright/test';
import E2ETestHelpers from '../../helpers';
import testUsers from '../../test_users';
import { getCanvasConfig } from '../../config/canvas.config';

// Re-export fixtures for convenience
export { CanvasTeacherPage, CanvasStudentPage } from '../../fixtures';
export { expect } from '@playwright/test';

// Filter Canvas users only
const canvasUsers = testUsers.filter(user => user.lms === 'canvas' || !user.lms);

// Track if setup has run to avoid running multiple times
let setupComplete = false;
let setupPromise: Promise<void> | null = null;

/**
 * Setup function that runs before all Canvas tests
 * This authenticates Canvas users and creates storage states
 */
async function canvasSetup() {
  // If setup is already complete, return immediately
  if (setupComplete) {
    return;
  }

  // If setup is in progress, wait for it
  if (setupPromise) {
    return setupPromise;
  }

  // Start setup
  setupPromise = (async () => {
    console.log('Starting Canvas LMS setup...');
    
    const { baseURL } = getCanvasConfig();
    const browser = await chromium.launch({ headless: false });
    const helper = new E2ETestHelpers(baseURL, browser);
    const pages = await Promise.all(canvasUsers.map(() => browser.newPage()));

    try {
      await Promise.all(
        pages.map((page, index) => {
          const user = canvasUsers[index];
          console.log(`Authenticating Canvas ${user.role} user: ${user.username}`);
          return helper.checkAndAuthenticateCanvasUser(user, page);
        })
      );
      console.log('Canvas authentication completed. Storage states saved.');
      setupComplete = true;
    } catch (error) {
      console.error('Canvas setup failed:', error);
      setupComplete = false;
      setupPromise = null;
      throw error;
    } finally {
      await Promise.all(pages.map((page) => page.close()));
      await browser.close();
    }
  })();

  return setupPromise;
}

// Run setup before all tests in this folder
baseTest.beforeAll(async () => {
  await canvasSetup();
});

// Export the test object for use in Canvas test files
export const test = baseTest;
