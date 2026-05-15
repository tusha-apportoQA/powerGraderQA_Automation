import { expect, Page, Locator } from '@playwright/test';

export class D2LLoginPage {
    page: Page;
    usernameField: Locator;
    passwordField: Locator;
    loginButton: Locator;
    loginForm: Locator;
    messageArea: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginForm = page.locator('form#formId');
        this.messageArea = page.locator('#d2l_messagearea');

        const form = this.loginForm;

        this.usernameField = form.getByLabel('Username', { exact: true });
        this.passwordField = form.getByLabel('Password', { exact: true });
        this.loginButton = form.getByRole('button', { name: 'Log In', exact: true });
    }

    async goto(baseURL: string) {
        await this.page.goto(`${baseURL}`, { waitUntil: 'domcontentloaded' });
        await this.waitForLoad();
    }

    async login(username: string, password: string) {
        await this.waitForLoad();

        await this.usernameField.fill(username);
        await this.passwordField.fill(password);

        await expect(this.loginButton).toBeVisible({ timeout: 10000 });
        await expect(this.loginButton).toBeEnabled({ timeout: 10000 });

        await this.loginButton.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);
        
        const isEnabled = await this.loginButton.isEnabled();
        const isVisible = await this.loginButton.isVisible();
        
        if (!isEnabled || !isVisible) {
            throw new Error(`Login button is not ready to be clicked. Enabled: ${isEnabled}, Visible: ${isVisible}`);
        }

        const clickPromise = (async () => {
            try {
                await this.loginButton.click({ timeout: 10000 });
            } catch (error) {
                console.warn('Normal click failed, trying force click');
                await this.loginButton.click({ force: true, timeout: 10000 });
            }
        })();
        
        const navigationPromise = this.page.waitForURL(/\/d2l\/home/, { timeout: 60000 });
        
        await Promise.all([clickPromise, navigationPromise]).catch(async (error) => {
            await this.page.waitForURL(url => {
                const urlStr = url.toString();
                return !urlStr.includes('/login') && !urlStr.includes('/lp/auth/login');
            }, { timeout: 60000 });
        });
        
        await this.page.waitForLoadState('domcontentloaded');
        await this.expectLoginSuccess();
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForTimeout(3000);
        await expect(this.loginForm).toBeVisible({ timeout: 30000 });
        await expect(this.usernameField).toBeVisible({ timeout: 30000 });
        await expect(this.passwordField).toBeVisible({ timeout: 30000 });
        await expect(this.loginButton).toBeVisible({ timeout: 30000 });
    }

    async expectURL(baseURL: string) {
        await this.page.waitForLoadState();
        await expect(this.page).toHaveURL(new RegExp(baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    async expectLoginSuccess() {
        const urlPattern = /\/d2l\/home(\/|\?|$)/;
        
        try {
            await this.page.waitForURL(urlPattern, { timeout: 60000 });
        } catch (error) {
            try {
                const myCoursesHeading = this.page.getByRole('heading', { name: 'My Courses', exact: true });
                await expect(myCoursesHeading).toBeVisible({ timeout: 10000 });
                console.log('Login success verified by "My Courses" heading (URL check failed but page loaded correctly)');
                return;
            } catch (fallbackError) {
                const currentURL = this.page.url();
                throw new Error(
                    `Login verification failed. Expected URL pattern /d2l/home but got: ${currentURL}. ` +
                    `Also could not find "My Courses" heading on page.`
                );
            }
        }
        
        try {
            const myCoursesHeading = this.page.getByRole('heading', { name: 'My Courses', exact: true });
            await expect(myCoursesHeading).toBeVisible({ timeout: 15000 });
        } catch (error) {
            console.warn('"My Courses" heading not immediately visible, but URL check passed. Login may still be successful.');
        }
    }

    async expectFailedLoginMessage() {
        await expect(this.messageArea).toBeVisible();
    }

    async expectLoginFormVisible() {
        await this.waitForLoad();
    }
}

