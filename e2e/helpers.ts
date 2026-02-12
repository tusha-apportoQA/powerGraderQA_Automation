import { UserRoleTypes, LMSType, UserCredentials } from './types';
import { Page, Browser } from '@playwright/test';
import testUsers from './test_users';
import { CanvasLoginPage } from './components/lms/canvas/pages/CanvasLoginPage';
import { D2LLoginPage } from './components/lms/d2l/pages/D2LLoginPage';

class E2ETestHelpers {
  baseURL?: string;
  browser: Browser;

  constructor(baseURL: string | undefined = '', browser: Browser) {
    this.baseURL = baseURL;
    this.browser = browser;
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
  }

  async checkAndAuthenticateD2LUser(user: UserCredentials, page: Page) {
    const loginPage = new D2LLoginPage(page);
    const baseURL = this.baseURL || process.env.D2L_BASE_URL || '';
    
    await loginPage.goto(baseURL);
    await loginPage.login(user.username, user.password);
    await loginPage.expectLoginSuccess();
    
    // Wait a bit more to ensure session cookies are fully set
    await page.waitForTimeout(2000);
    
    // Verify we're actually logged in by checking for "My Courses" heading
    try {
      await page.getByRole('heading', { name: 'My Courses' }).waitFor({ state: 'visible', timeout: 10000 });
      console.log('Dashboard "My Courses" heading is visible - session confirmed');
    } catch (error) {
      // Fallback: check for heading by ID or class
      try {
        await page.locator('h2#d2l_1_5_507, h2.d2l-heading:has-text("My Courses")').waitFor({ state: 'visible', timeout: 5000 });
        console.log('Dashboard "My Courses" heading found by fallback selector');
      } catch (fallbackError) {
        console.warn('Dashboard "My Courses" heading not immediately visible, but continuing...');
      }
    }
  }

  /**
   * Create a new browser context, authenticate the user, and return an authenticated page.
   * This is used for test-level authentication where each test gets a fresh session.
   * 
   * @param lms - LMS type ('canvas' or 'd2l')
   * @param role - User role ('teacher' or 'student')
   * @param browser - Playwright browser instance
   * @param baseURL - Base URL for the LMS
   * @returns Authenticated page ready for use in tests
   */
  public static async authenticateAndGetPage(
    lms: LMSType,
    role: UserRoleTypes,
    browser: Browser,
    baseURL: string
  ): Promise<Page> {
    const user = E2ETestHelpers.getUserByLMSAndRole(lms, role);
    if (!user) {
      throw new Error(`No user found for ${lms} ${role}`);
    }

    // Create fresh browser context for this test
    const context = await browser.newContext();
    const page = await context.newPage();
    const helper = new E2ETestHelpers(baseURL, browser);
    
    // Authenticate with the appropriate LMS
    if (lms === 'canvas') {
      await helper.checkAndAuthenticateCanvasUser(user, page);
    } else if (lms === 'd2l') {
      await helper.checkAndAuthenticateD2LUser(user, page);
    } else {
      throw new Error(`Unsupported LMS: ${lms}`);
    }
    
    return page;
  }

  public static getCanvasBaseURL(): string {
    return process.env.CANVAS_BASE_URL || '';
  }

  public static getD2LBaseURL(): string {
    return process.env.D2L_BASE_URL || '';
  }

  /**
   * Get base URL for a specific LMS
   */
  public static getBaseURLForLMS(lms: LMSType): string {
    switch (lms) {
      case 'canvas':
        return process.env.CANVAS_BASE_URL || 'https://apporto.instructure.com';
      case 'd2l':
        return process.env.D2L_BASE_URL || '';
      default:
        throw new Error(`Unsupported LMS: ${lms}`);
    }
  }

  public static getPowerGraderBaseURL(): string {
    return process.env.POWERGRADER_BASE_URL || '';
  }
}

export default E2ETestHelpers;
