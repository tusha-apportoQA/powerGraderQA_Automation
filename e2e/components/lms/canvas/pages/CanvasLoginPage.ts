import { expect, Page, Locator } from '@playwright/test';

export class CanvasLoginPage {
    page: Page;
    emailField: Locator;
    passwordField: Locator;
    loginButton: Locator;
    failedLogin: Locator;
    forgotPasswordLink: Locator;
    rememberMeCheckbox: Locator;
    loginForm: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginForm = page.locator('id=login_form');

        const form = this.loginForm;
        this.emailField = form.getByLabel('Email', { exact: true });
        this.passwordField = form.getByLabel('Password', { exact: true });
        this.loginButton = form.getByRole('button', { name: 'Log In', exact: true });
        this.forgotPasswordLink = form.getByRole('link', { name: 'Forgot Password?', exact: true });
        this.rememberMeCheckbox = form.getByLabel('Stay signed in', { exact: true });
        this.failedLogin = page.locator('id=flash_message_holder');
    }

    /*async goto(baseURL: string) {
        await this.page.goto(`${baseURL}/login/canvas`, { waitUntil: 'domcontentloaded' });
        await this.page.waitForLoadState();
    }*/
    async goto(baseURL: string) {
        const url = `${baseURL}/login/canvas`;

        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded' });
            await this.page.waitForLoadState();
            return;
            } catch (e: any) {
            const msg = String(e?.message ?? e);

            // only retry this specific transient error
            if (!msg.includes('net::ERR_NETWORK_CHANGED')) throw e;

            await this.page.waitForTimeout(1000 * attempt); // small backoff
            }
        }

            throw new Error(`CanvasLoginPage.goto: net::ERR_NETWORK_CHANGED persisted after retries: ${url}`);
    }

    async login(email: string, password: string) {
        await this.emailField.click();
        await this.emailField.fill(email);
        await this.passwordField.click();
        await this.passwordField.fill(password);
        await this.loginButton.click();
        await this.page.waitForURL(/\/\?login_success=1|\/dashboard|\/courses/, { timeout: 30000 });
        await this.page.waitForLoadState();
    }

    async expectURL(baseURL: string) {
        await this.page.waitForLoadState();
        await expect(this.page).toHaveURL(new RegExp(baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    async expectLoginSuccess() {
        await this.page.waitForLoadState();
        await expect(this.page).toHaveURL(/\/\?login_success=1|\/dashboard|\/courses/);
    }

    async expectFailedLoginMessage() {
        await expect(this.failedLogin).toBeVisible();
    }

    async expectLoginFormVisible() {
        await expect(this.emailField).toBeVisible();
        await expect(this.passwordField).toBeVisible();
        await expect(this.loginButton).toBeVisible();
    }

    async expectHasForgotPasswordLink() {
        await expect(this.forgotPasswordLink).toBeVisible();
    }
}
