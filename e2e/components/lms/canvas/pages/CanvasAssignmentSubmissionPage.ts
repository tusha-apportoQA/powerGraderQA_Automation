    import { expect, Page, Locator } from '@playwright/test';
    import { FormatType } from '../../../../types';

    export class CanvasAssignmentSubmissionPage {
    page: Page;
    fileUploadInput: Locator;
    submissionForm: Locator;
    submissionCommentTextarea: Locator;
    submitButton: Locator;
    cancelButton: Locator;
    submissionSidebar: Locator;
    submittedText: Locator;

    constructor(page: Page) {
        this.page = page;

        this.submissionForm = page.locator('#submit_assignment');
        //this.submissionForm = page.locator('#submit_assignment:visible');
        //this.fileUploadInput = page.locator('input[data-testid="file-upload-0"]:visible');
        this.fileUploadInput = page.locator('input[data-testid="file-upload-0"]');
        this.submissionCommentTextarea = page.locator('textarea#submission_comment');
        this.submitButton = page.getByRole('button', { name: 'Submit assignment' });
        this.cancelButton = page.locator('button.cancel_button');

        this.submissionSidebar = page.locator('#sidebar_content');
        this.submittedText = this.submissionSidebar.getByText('Submitted!');
    }

    async waitForLoad(): Promise<void> {
            // Don't hard-require a URL change; Canvas sometimes stays on /assignments/<id>
            await Promise.race([
                this.page.waitForURL(/\/submissions/, { timeout: 15000 }).catch(() => {}),
                this.page.waitForSelector('#submit_assignment', { state: 'visible', timeout: 30000 })
            ]);

            await Promise.race([
            this.page
                .waitForSelector('form#submit_online_text_entry_form', { state: 'visible', timeout: 30000 })
                .then(() => true)
                //.catch(() => null),
                 .catch(() => new Promise(() => {})),

            this.page
                .waitForSelector('iframe#submission_body_ifr', { state: 'attached', timeout: 30000 })
                .then(() => true)
                //.catch(() => null),
                 .catch(() => new Promise(() => {})),

            this.page
                .waitForSelector('input[data-testid="file-upload-0"]', { state: 'attached', timeout: 30000 })
                .then(() => true)
                //.catch(() => null),
                 .catch(() => new Promise(() => {})),
            ]);

            await this.page.waitForTimeout(300);
        }

    async uploadFile(filePath: string): Promise<void> {
        await this.waitForLoad();

        const fileUploadTab = this.page.getByRole('tab', { name: /File Upload/i });
        if (await fileUploadTab.isVisible().catch(() => false)) {
        await fileUploadTab.click();
        }

        //await expect(this.fileUploadInput).toBeVisible({ timeout: 30000 });
        //await this.fileUploadInput.setInputFiles(filePath);
        await this.fileUploadInput.waitFor({ state: 'attached', timeout: 30000 });
        await this.fileUploadInput.setInputFiles(filePath);
        await this.page.waitForTimeout(1000);
    }

    async fillTextEntry(text: string): Promise<void> {
        await this.waitForLoad();

        const textEntryTab = this.page.getByRole('tab', { name: /Text Entry/i });
        if (await textEntryTab.isVisible().catch(() => false)) {
            await textEntryTab.click();
            await this.page.waitForTimeout(500); // Wait for tab transition
        }

        const iframe = this.page.frameLocator('iframe[title*="Rich Text Area"]').first();
        const plainTextArea = this.page.locator('textarea#submission_body'); // Specific ID for Canvas Text Entry

        // Try Rich Text Editor first
        if (await this.page.locator('iframe[title*="Rich Text Area"]').first().isVisible().catch(() => false)) {
            const iframeBody = iframe.locator('body');
            await expect(iframeBody).toBeVisible({ timeout: 10000 });
            await iframeBody.fill(text);
        } else {
            // Fallback to plain textarea (ID #submission_body)
            await expect(plainTextArea).toBeVisible({ timeout: 10000 });
            await plainTextArea.fill(text);
        }
        await this.page.waitForTimeout(500);
    }

    async fillComment(comment: string): Promise<void> {
        await expect(this.submissionCommentTextarea).toBeVisible({ timeout: 10000 });
        await this.submissionCommentTextarea.fill(comment);
    }

    async prepareSubmission(
        submissionType: FormatType,
        filePath?: string,
        text?: string
    ): Promise<void> {
        switch (submissionType) {
        case '.pdf':
        case '.docx': {
            if (!filePath) {
            throw new Error(`File path is required for ${submissionType} submission type`);
            }
            await this.uploadFile(filePath);
            break;
        }

        case '.txt': {
            if (!filePath) {
                throw new Error(`File path is required for ${submissionType} submission type`);
            }

            const fileUploadTab = this.page.getByRole('tab', { name: /File Upload/i });
            if (await fileUploadTab.isVisible().catch(() => false)) {
                await fileUploadTab.click();
                await this.page.waitForTimeout(500); // Critical: Wait for UI to switch tabs
            }

            // If File Upload is an option and the input appeared, use it
            if (await this.fileUploadInput.isVisible().catch(() => false)) {
                await this.uploadFile(filePath);
            } else if (text) {
                // Otherwise, use Text Entry if text content was provided
                await this.fillTextEntry(text);
            } else {
                throw new Error('Canvas does not show File Upload for .txt, and no fallback text was provided.');
            }
            break;
        }

        case 'Text Entry': {
            if (!text) {
            throw new Error('Text content is required for Text Entry submission type');
            }
            await this.fillTextEntry(text);
            break;
        }

        default:
            throw new Error(`Unsupported submission type: ${submissionType}`);
        }
    }

    async verifySubmissionReady(submissionType: FormatType): Promise<void> {
        const uploadVisible = await this.fileUploadInput.isVisible().catch(() => false);
        const treatAsTextEntry = submissionType === 'Text Entry' || (submissionType === '.txt' && !uploadVisible);

        if (treatAsTextEntry) {
            const iframe = this.page.frameLocator('iframe[title*="Rich Text Area"]').first();
            const plainTextArea = this.page.locator('textarea#submission_body');

            if (await this.page.locator('iframe[title*="Rich Text Area"]').first().isVisible().catch(() => false)) {
                const bodyText = await iframe.locator('body').textContent();
                if (!bodyText || bodyText.trim() === '') throw new Error('Text entry content is empty');
            } else {
                await expect(plainTextArea).toBeVisible({ timeout: 10000 });
                await expect(plainTextArea).not.toHaveValue('');
            }
            return;
        }

        await expect(this.fileUploadInput).toBeVisible({ timeout: 10000 });
    }

    async submitAssignment(): Promise<void> {
        await expect(this.submitButton).toBeVisible({ timeout: 30000 });
        await expect(this.submitButton).toBeEnabled({ timeout: 10000 });

        await this.submitButton.scrollIntoViewIfNeeded();
        await this.submitButton.click();

        await this.page.waitForTimeout(2000);

        try {
        await this.page.waitForURL(/.*\/submissions.*/, { timeout: 5000 }).catch(() => {});
        } catch {
        // URL might not change, continue
        }
    }

    async verifySubmissionSuccess(): Promise<void> {
        await expect(this.submissionSidebar).toBeVisible({ timeout: 30000 });
        await expect(this.submittedText).toBeVisible({ timeout: 30000 });
    }
    }