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
        // Use first() to handle cases where both elements exist (text entry has both container and form)
        this.submissionForm = page.locator('div#submit_assignment, form#submit_online_text_entry_form').first();
        this.fileUploadInput = page.locator('input[data-testid="file-upload-0"]');
        this.submissionCommentTextarea = page.locator('textarea#submission_comment');
        this.submitButton = page.getByRole('button', { name: 'Submit assignment' });
        this.cancelButton = page.locator('button.cancel_button');
        
        // Submission verification locators - scoped to sidebar
        this.submissionSidebar = page.locator('#sidebar_content');
        this.submittedText = this.submissionSidebar.getByText('Submitted!');
    }

    async waitForLoad(): Promise<void> {
        // Wait for either file upload form or text entry form (using first() to avoid strict mode violation)
        await expect(this.submissionForm).toBeVisible({ timeout: 30000 });
        await this.page.waitForTimeout(500);
    }

    /**
     * Upload a file for file-based submission types (.pdf, .docx, .txt)
     * @param filePath - Path to the file to upload (relative to project root)
     */
    async uploadFile(filePath: string): Promise<void> {
        await this.waitForLoad();
        await expect(this.fileUploadInput).toBeVisible({ timeout: 30000 });
        await this.fileUploadInput.setInputFiles(filePath);
        await this.page.waitForTimeout(1000);
    }

    /**
     * Fill text entry for Text Entry submission type
     * @param text - Text content to enter
     */
    async fillTextEntry(text: string): Promise<void> {
        await this.waitForLoad();

        const iframe = this.page.locator('iframe[title*="Rich Text Area"]').first();

        try {
            const iframeCount = await iframe.count();

            if (iframeCount > 0 && await iframe.isVisible().catch(() => false)) {
                const iframeLocator = this.page.frameLocator('iframe[title*="Rich Text Area"]').first();
                const iframeBody = iframeLocator.locator('body');
                await expect(iframeBody).toBeVisible({ timeout: 10000 });
                await iframeBody.click({ timeout: 5000 });
                await this.page.waitForTimeout(300);
                await iframeBody.fill(text);
                // Wait for the editor to process the content
                await this.page.waitForTimeout(1000);
            } else {
                const textarea = this.page.locator('textarea').filter({ hasNotText: 'Comments...' }).first();
                await expect(textarea).toBeVisible({ timeout: 10000 });
                await textarea.fill(text);
                await this.page.waitForTimeout(500);
            }
        } catch (error) {
            const textarea = this.page.locator('textarea').filter({ hasNotText: 'Comments...' }).first();
            await expect(textarea).toBeVisible({ timeout: 10000 });
            await textarea.fill(text);
            await this.page.waitForTimeout(500);
        }
    }

    async fillComment(comment: string): Promise<void> {
        await expect(this.submissionCommentTextarea).toBeVisible({ timeout: 10000 });
        await this.submissionCommentTextarea.fill(comment);
    }

    /**
     * Handle submission based on submission type
     * @param submissionType - Type of submission (.pdf, .docx, .txt, or 'Text Entry')
     * @param filePath - Path to file (required for file types)
     * @param text - Text content (required for Text Entry)
     */
    async prepareSubmission(
        submissionType: FormatType,
        filePath?: string,
        text?: string
    ): Promise<void> {
        switch (submissionType) {
            case '.pdf':
            case '.docx':
            case '.txt':
                if (!filePath) {
                    throw new Error(`File path is required for ${submissionType} submission type`);
                }
                await this.uploadFile(filePath);
                break;

            case 'Text Entry':
                if (!text) {
                    throw new Error('Text content is required for Text Entry submission type');
                }
                await this.fillTextEntry(text);
                break;

            default:
                throw new Error(`Unsupported submission type: ${submissionType}`);
        }
    }

    async verifySubmissionReady(submissionType: FormatType): Promise<void> {
        if (submissionType === 'Text Entry') {
            // For text entry, verify the rich text editor iframe has content
            const iframe = this.page.locator('iframe[title*="Rich Text Area"]').first();
            const iframeCount = await iframe.count();
            
            if (iframeCount > 0 && await iframe.isVisible().catch(() => false)) {
                const iframeLocator = this.page.frameLocator('iframe[title*="Rich Text Area"]').first();
                const iframeBody = iframeLocator.locator('body');
                await expect(iframeBody).toBeVisible({ timeout: 10000 });
                // Check if body has content (not empty)
                const bodyText = await iframeBody.textContent();
                if (!bodyText || bodyText.trim() === '') {
                    throw new Error('Text entry content is empty');
                }
            } else {
                // Fallback to textarea check
                const textarea = this.page.locator('textarea').filter({ hasNotText: 'Comments...' }).first();
                await expect(textarea).toBeVisible({ timeout: 10000 });
                await expect(textarea).not.toHaveValue('');
            }
            // Wait a bit for the editor to be ready
            await this.page.waitForTimeout(1000);
        } else {
            await expect(this.fileUploadInput).toBeVisible({ timeout: 10000 });
            await this.page.waitForTimeout(1000);
        }
    }

    /**
     * Submit the assignment by clicking the submit button
     */
    async submitAssignment(): Promise<void> {
        // Wait for submit button to be visible and enabled
        await expect(this.submitButton).toBeVisible({ timeout: 30000 });
        await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
        
        // Scroll into view if needed
        await this.submitButton.scrollIntoViewIfNeeded();
        
        await this.submitButton.click();
        
        // Wait for submission to process - wait for navigation or sidebar update
        await this.page.waitForTimeout(2000);
        
        // Wait for either navigation or sidebar to appear
        try {
            await this.page.waitForURL(/.*\/submissions.*/, { timeout: 5000 }).catch(() => {});
        } catch (e) {
            // URL might not change, continue
        }
    }

    /**
     * Verify that the assignment was successfully submitted
     */
    async verifySubmissionSuccess(): Promise<void> {
        await expect(this.submissionSidebar).toBeVisible({ timeout: 30000 });
        await expect(this.submittedText).toBeVisible({ timeout: 30000 });
    }
}
