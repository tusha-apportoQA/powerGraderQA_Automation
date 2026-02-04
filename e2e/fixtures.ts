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
    const canvasBaseURL = baseURL || E2ETestHelpers.getCanvasBaseURL() || process.env.CANVAS_BASE_URL || 'https://apporto.instructure.com';
    
    const storageStateExists = await E2ETestHelpers.storageStateExists(lms, role);
    
    let page: Page;

    if (storageStateExists) {
      let context;
      try {
        context = await browser.newContext({
          storageState: storageStatePath
        });
        page = await context.newPage();
        
        const isValid = await E2ETestHelpers.validateStorageState(page, canvasBaseURL);
        
        if (!isValid) {
          console.log(`Storage state for ${lms} ${role} is invalid/expired. Re-authenticating...`);
          await context.close();
          page = await E2ETestHelpers.reAuthenticateAndGetPage(lms, role, browser, canvasBaseURL);
        } else {
          console.log(`Using existing storage state for ${lms} ${role}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Failed to load storage state for ${lms} ${role}: ${errorMessage}. Re-authenticating...`);
        if (context) {
                    await context.close().catch(() => {});
        }
        page = await E2ETestHelpers.reAuthenticateAndGetPage(lms, role, browser, canvasBaseURL);
      }
    } else {
      console.log(`Storage state for ${lms} ${role} not found. Authenticating...`);
      page = await E2ETestHelpers.reAuthenticateAndGetPage(lms, role, browser, canvasBaseURL);
    }

    return new BasePage(page);
  }
}

export class CanvasTeacherPage extends BasePage {
}

export class CanvasStudentPage extends BasePage {
}

type AppFixtures = {
  canvasTeacherPage: CanvasTeacherPage;
  canvasStudentPage: CanvasStudentPage;
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
  ]
});
