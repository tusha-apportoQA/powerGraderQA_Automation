import { test as base, Page, Browser } from '@playwright/test';
export { expect } from '@playwright/test';

import { UserRoleTypes, LMSType } from './types';
import E2ETestHelpers from './helpers';

class BasePage {
  page: Page;
  context: any; // BrowserContext - stored for cleanup

  constructor(page: Page, context?: any) {
    this.page = page;
    this.context = context;
  }

  /**
   * Create authenticated page for test-level authentication.
   * Each test gets a fresh authentication session in a new browser context.
   */
  static async create(browser: Browser, lms: LMSType, role: UserRoleTypes, baseURL?: string) {
    const lmsBaseURL = baseURL || E2ETestHelpers.getBaseURLForLMS(lms);
    
    
    //console.log(`[Test-level Auth] ${lms} ${role} assignment creation/publish...`);
    //console.log(`[Test-level Auth] ${lms} ${role} assignment ${role.toLowerCase() === 'teacher' ? 'creation/publish' : 'submission'}...`);
    
    // Authenticate fresh for each test - creates new context and authenticates
    const page = await E2ETestHelpers.authenticateAndGetPage(lms, role, browser, lmsBaseURL);
    const context = page.context();

    return new BasePage(page, context);
  }

  /**
   * Close the browser context and page
   * Called automatically by Playwright fixture teardown
   */
  async close() {
    if (this.context) {
      await this.context.close().catch((error: Error) => {
        console.warn(`Error closing context: ${error.message}`);
      });
    } else if (this.page) {
      await this.page.close().catch((error: Error) => {
        console.warn(`Error closing page: ${error.message}`);
      });
    }
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
      const page = await CanvasTeacherPage.create(browser, 'canvas', 'teacher', canvasBaseURL);
      
      // Use the fixture - test runs here
      await use(page);
      
      // Teardown: Close context and page after test completes
      await page.close();
    },
    // @ts-expect-error - Playwright supports 'test' scope, but types may be strict in v1.40
    { scope: 'test' } // Test-scoped: each test gets fresh auth and cleanup
  ],
  canvasStudentPage: [
    async ({ browser }, use) => {
      const canvasBaseURL = E2ETestHelpers.getCanvasBaseURL() || process.env.CANVAS_BASE_URL || 'https://apporto.instructure.com';
      const page = await CanvasStudentPage.create(browser, 'canvas', 'student', canvasBaseURL);
      
      await use(page);
      await page.close();
    },
    // @ts-expect-error - Playwright supports 'test' scope, but types may be strict in v1.40
    { scope: 'test' }
  ],
  d2lTeacherPage: [
    async ({ browser }, use) => {
      const d2lBaseURL = E2ETestHelpers.getD2LBaseURL() || process.env.D2L_BASE_URL || '';
      const page = await D2LTeacherPage.create(browser, 'd2l', 'teacher', d2lBaseURL);
      
      await use(page);
      await page.close();
    },
    // @ts-expect-error - Playwright supports 'test' scope, but types may be strict in v1.40
    { scope: 'test' }
  ],
  d2lStudentPage: [
    async ({ browser }, use) => {
      const d2lBaseURL = E2ETestHelpers.getD2LBaseURL() || process.env.D2L_BASE_URL || '';
      const page = await D2LStudentPage.create(browser, 'd2l', 'student', d2lBaseURL);
      
      await use(page);
      await page.close();
    },
    // @ts-expect-error - Playwright supports 'test' scope, but types may be strict in v1.40
    { scope: 'test' }
  ]
});
