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
        console.warn('Dashboard "My Courses" heading not immediately visible, but continuing with storage state save...');
      }
    }
    
    // Save storage state - this captures cookies and localStorage
    const storageStatePath = E2ETestHelpers.storageStateByLMSAndRole(user.lms || 'd2l', user.role);
    await page.context().storageState({ path: storageStatePath });
    
    console.log(`Storage state saved for D2L ${user.role} to: ${storageStatePath}`);
    
    // Verify the storage state was saved correctly
    const fs = require('fs');
    if (!fs.existsSync(storageStatePath)) {
      throw new Error(`Failed to save storage state to ${storageStatePath}`);
    }
    
    // Verify the storage state contains cookies
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    if (!storageState.cookies || storageState.cookies.length === 0) {
      throw new Error(`Storage state saved but contains no cookies. Authentication may have failed.`);
    }
    
    console.log(`Storage state verified: ${storageState.cookies.length} cookies saved`);
  }

  public static async storageStateExists(lms: LMSType, role: UserRoleTypes): Promise<boolean> {
    const fs = require('fs');
    const path = E2ETestHelpers.storageStateByLMSAndRole(lms, role);
    return fs.existsSync(path);
  }

  /**
   * Check if storage state is expired (older than 15 minutes)
   * @param lms - LMS type
   * @param role - User role
   * @returns true if expired or doesn't exist, false if valid
   */
  public static async isStorageStateExpired(lms: LMSType, role: UserRoleTypes): Promise<boolean> {
    const fs = require('fs');
    const path = require('path');
    const storageStatePath = E2ETestHelpers.storageStateByLMSAndRole(lms, role);
    
    if (!fs.existsSync(storageStatePath)) {
      return true; // Doesn't exist, consider expired
    }

    try {
      const stats = fs.statSync(storageStatePath);
      const now = Date.now();
      const fileAge = now - stats.mtimeMs;
      const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      const isExpired = fileAge > expirationTime;
      if (isExpired) {
        console.log(`Storage state for ${lms} ${role} is expired (age: ${Math.round(fileAge / 1000 / 60)} minutes)`);
      }
      return isExpired;
    } catch (error) {
      console.log(`Error checking storage state expiration for ${lms} ${role}: ${error}`);
      return true; // On error, consider expired to be safe
    }
  }

  public static async validateStorageState(page: Page, baseURL: string, lms?: LMSType): Promise<boolean> {
    try {
      const lmsType = lms || (baseURL.includes('d2l') ? 'd2l' : 'canvas');
      
      if (lmsType === 'd2l') {
        await page.goto(`${baseURL}/d2l/home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } else {
        await page.goto(`${baseURL}/?login_success=1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      
      // Wait a bit for redirects
      await page.waitForTimeout(1000);
      
      const currentURL = page.url();
      if (currentURL.includes('/login') || currentURL.includes('/d2l/lp/auth/login')) {
        console.log(`Storage state validation failed: Still on login page (${currentURL})`);
        return false;
      }
      
      if (lmsType === 'd2l') {
        // Wait for "My Courses" heading - this is the actual element on D2L dashboard
        try {
          const myCoursesHeading = page.getByRole('heading', { name: 'My Courses' });
          await myCoursesHeading.waitFor({ state: 'visible', timeout: 10000 });
          console.log('Storage state validation successful: "My Courses" heading visible');
          return true;
        } catch (error) {
          // Fallback: check for the heading by ID or class
          try {
            const headingById = page.locator('h2#d2l_1_5_507, h2.d2l-heading:has-text("My Courses")');
            await headingById.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Storage state validation successful: "My Courses" heading found by fallback selector');
            return true;
          } catch (fallbackError) {
            // If heading not found, check if we're at least on the home page
            if (currentURL.includes('/d2l/home')) {
              console.log('Storage state validation: On home page but heading not visible, considering valid');
              return true;
            }
            console.log('Storage state validation failed: "My Courses" heading not found');
            return false;
          }
        }
      } else {
        const dashboardHeader = page.locator('h1:has-text("Dashboard")');
        await dashboardHeader.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Storage state validation successful: Dashboard header visible');
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Storage state validation error: ${errorMessage}`);
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
