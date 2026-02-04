import { UserRoleTypes, LMSType, UserCredentials } from './types';
import { Page, Browser } from '@playwright/test';
import testUsers from './test_users';
import { CanvasLoginPage } from './components/lms/canvas/pages/CanvasLoginPage';

class E2ETestHelpers {
  baseURL?: string;
  browser: Browser;

  constructor(baseURL: string | undefined = '', browser: Browser) {
    this.baseURL = baseURL;
    this.browser = browser;
  }

  public static storageStateByLMSAndRole(lms: LMSType, role: UserRoleTypes): string {
    return `playwright_states/${lms}_${role}StorageState.json`;
  }

  public static getUserByLMSAndRole(lms: LMSType, role: UserRoleTypes): UserCredentials | undefined {
    return testUsers.find(user => user.lms === lms && user.role === role);
  }

  async checkAndAuthenticateCanvasUser(user: UserCredentials, page: Page) {
    const loginPage = new CanvasLoginPage(page);
    const baseURL = this.baseURL || process.env.CANVAS_BASE_URL || '';
    
    await loginPage.goto(baseURL);
    await loginPage.login(user.username, user.password);
    await loginPage.expectLoginSuccess();
    
    await page.context().storageState({
      path: E2ETestHelpers.storageStateByLMSAndRole(user.lms || 'canvas', user.role)
    });
  }

  public static async storageStateExists(lms: LMSType, role: UserRoleTypes): Promise<boolean> {
    const fs = require('fs');
    const path = E2ETestHelpers.storageStateByLMSAndRole(lms, role);
    return fs.existsSync(path);
  }

  public static async validateStorageState(page: Page, baseURL: string): Promise<boolean> {
    try {
      await page.goto(`${baseURL}/?login_success=1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      const currentURL = page.url();
      if (currentURL.includes('/login')) {
        return false;
      }
      
      const dashboardHeader = page.locator('h1:has-text("Dashboard")');
      await dashboardHeader.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  public static async reAuthenticateAndGetPage(
    lms: LMSType,
    role: UserRoleTypes,
    browser: Browser,
    baseURL: string
  ): Promise<Page> {
    const user = E2ETestHelpers.getUserByLMSAndRole(lms, role);
    if (!user) {
      throw new Error(`No user found for ${lms} ${role}`);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    const helper = new E2ETestHelpers(baseURL, browser);
    
    await helper.checkAndAuthenticateCanvasUser(user, page);
    
    return page;
  }

  public static getCanvasBaseURL(): string {
    return process.env.CANVAS_BASE_URL || '';
  }

  public static getPowerGraderBaseURL(): string {
    return process.env.POWERGRADER_BASE_URL || '';
  }
}

export default E2ETestHelpers;
