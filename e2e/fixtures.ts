import { test as base, Page, Browser } from '@playwright/test';
export { expect } from '@playwright/test';

import { UserRoleTypes, LMSType } from './types';
import E2ETestHelpers from './helpers';

class BasePage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  static async create(browser: Browser, lms: LMSType, role: UserRoleTypes, baseURL?: string) {
    const storageStatePath = E2ETestHelpers.storageStateByLMSAndRole(lms, role);
    const lmsBaseURL = baseURL || E2ETestHelpers.getBaseURLForLMS(lms);
    
    console.log(`Creating ${lms} ${role} page. Storage state path: ${storageStatePath}`);
    
    // Check if storage state exists and is not expired (15 minutes)
    const storageStateExists = await E2ETestHelpers.storageStateExists(lms, role);
    const isExpired = storageStateExists ? await E2ETestHelpers.isStorageStateExpired(lms, role) : true;
    
    let page: Page;

    if (storageStateExists && !isExpired) {
      // Storage state exists and is valid (less than 15 minutes old)
      let context;
      try {
        console.log(`Loading storage state from: ${storageStatePath} (valid, not expired)`);
        context = await browser.newContext({
          storageState: storageStatePath
        });
        page = await context.newPage();
        
        // Quick validation to ensure it still works
        console.log(`Quick validation of storage state for ${lms} ${role}...`);
        const isValid = await E2ETestHelpers.validateStorageState(page, lmsBaseURL, lms);
        
        if (!isValid) {
          console.log(`Storage state for ${lms} ${role} failed validation. Re-authenticating...`);
          await context.close();
          page = await E2ETestHelpers.reAuthenticateAndGetPage(lms, role, browser, lmsBaseURL);
        } else {
          console.log(`✓ Using existing valid storage state for ${lms} ${role}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Failed to load storage state for ${lms} ${role}: ${errorMessage}. Re-authenticating...`);
        if (context) {
          await context.close().catch(() => {});
        }
        page = await E2ETestHelpers.reAuthenticateAndGetPage(lms, role, browser, lmsBaseURL);
      }
    } else {
      // Storage state doesn't exist or is expired - authenticate
      if (isExpired) {
        console.log(`Storage state for ${lms} ${role} is expired (>15 minutes). Authenticating...`);
      } else {
        console.log(`Storage state for ${lms} ${role} not found at ${storageStatePath}. Authenticating...`);
      }
      page = await E2ETestHelpers.reAuthenticateAndGetPage(lms, role, browser, lmsBaseURL);
    }

    return new BasePage(page);
  }
}

export class CanvasTeacherPage extends BasePage {
}

export class CanvasStudentPage extends BasePage {
}

export class D2LTeacherPage extends BasePage {
}

export class D2LStudentPage extends BasePage {
}

type AppFixtures = {
  canvasTeacherPage: CanvasTeacherPage;
  canvasStudentPage: CanvasStudentPage;
  d2lTeacherPage: D2LTeacherPage;
  d2lStudentPage: D2LStudentPage;
};

export const test = base.extend<{}, AppFixtures>({
  canvasTeacherPage: [
    async ({ browser }, use) => {
      const canvasBaseURL = E2ETestHelpers.getCanvasBaseURL() || process.env.CANVAS_BASE_URL || 'https://apporto.instructure.com';
      await use(await CanvasTeacherPage.create(browser, 'canvas', 'teacher', canvasBaseURL));
    },
    { scope: 'worker' }
  ],
  canvasStudentPage: [
    async ({ browser }, use) => {
      const canvasBaseURL = E2ETestHelpers.getCanvasBaseURL() || process.env.CANVAS_BASE_URL || 'https://apporto.instructure.com';
      await use(await CanvasStudentPage.create(browser, 'canvas', 'student', canvasBaseURL));
    },
    { scope: 'worker' }
  ],
  d2lTeacherPage: [
    async ({ browser }, use) => {
      const d2lBaseURL = E2ETestHelpers.getD2LBaseURL() || process.env.D2L_BASE_URL || '';
      await use(await D2LTeacherPage.create(browser, 'd2l', 'teacher', d2lBaseURL));
    },
    { scope: 'worker' }
  ],
  d2lStudentPage: [
    async ({ browser }, use) => {
      const d2lBaseURL = E2ETestHelpers.getD2LBaseURL() || process.env.D2L_BASE_URL || '';
      await use(await D2LStudentPage.create(browser, 'd2l', 'student', d2lBaseURL));
    },
    { scope: 'worker' }
  ]
});
