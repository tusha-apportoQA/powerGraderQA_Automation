import { expect, Page, Locator } from '@playwright/test';

export class MoodleLoginPage {
    page: Page;
    usernameField: Locator;
    passwordField: Locator;
    loginButton: Locator;
    loginForm: Locator;

    constructor(page: Page) {
        this.page = page;
        this.usernameField = page.getByRole('textbox', { name: 'Username' });
        this.passwordField = page.getByRole('textbox', { name: 'Password' });
        this.loginButton = page.getByText('Log in', { exact: true });
        this.loginForm = page.locator('form').first();
    }

    async goto(baseURL: string) {
        await this.page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
        await this.page.waitForLoadState('load', { timeout: 10000 }).catch(() => {
            // After 10s if still loading, proceed; waitForLoad will ensure login elements are visible
        });
        await this.waitForLoad();
    }

    async login(username: string, password: string): Promise<void> {
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

        await clickPromise;
        await this.page.waitForURL(url => {
            const u = url.toString();
            return u.includes('/my') || u.includes('/login');
        }, { timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded');

        if (this.page.url().includes('/my')) {
            await this.expectLoginSuccess();
            return;
        }

        // Session-timeout page has no specific URL; we expect the session-timeout message to be visible.
        const sessionTimeoutMessage = this.page.getByText(/your session has timed out\.?\s*please log in again\.?/i).first();
        await expect(sessionTimeoutMessage, 'Not on /my and session-timeout message not found (expected session-timeout page)').toBeVisible({ timeout: 5000 });

        console.log('[Moodle Login] Session timed out page detected; retrying login.');
        await this.usernameField.fill(username);
        await this.passwordField.fill(password);
        await this.loginButton.click({ timeout: 10000 }).catch(() => this.loginButton.click({ force: true, timeout: 10000 }));
        await this.page.waitForURL(/\/my/, { timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded');
        await this.expectLoginSuccess();
    }

    async waitForLoad(): Promise<void> {
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
        const urlPattern = /\/my(\/|\?|$)/;
        
        try {
            await this.page.waitForURL(urlPattern, { timeout: 60000 });
        } catch (error) {
            try {
                // Fallback: Check for dashboard elements
                const dashboardHeading = this.page.getByRole('heading', { name: /dashboard|my courses|available courses/i });
                await expect(dashboardHeading).toBeVisible({ timeout: 10000 });
                console.log('Login success verified by dashboard heading (URL check failed but page loaded correctly)');
                return;
            } catch (fallbackError) {
                const currentURL = this.page.url();
                throw new Error(
                    `Login verification failed. Expected URL pattern /my but got: ${currentURL}. ` +
                    `Also could not find dashboard heading on page.`
                );
            }
        }
        
        try {
            // Verify dashboard is loaded by checking for common Moodle dashboard elements
            const dashboardContent = this.page.locator('body').first();
            await expect(dashboardContent).toBeVisible({ timeout: 15000 });
        } catch (error) {
            console.warn('Dashboard content not immediately visible, but URL check passed. Login may still be successful.');
        }
    }

    async expectFailedLoginMessage() {
        const errorMessage = this.page.locator('.alert-danger, .error, [role="alert"]').first();
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }

    async expectLoginFormVisible() {
        await this.waitForLoad();
    }
}

