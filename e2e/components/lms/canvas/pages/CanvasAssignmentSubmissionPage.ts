    /*import { expect, Page, Locator } from '@playwright/test';
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
        //this.submitButton = page.getByRole('button', { name: 'Submit assignment' });
        this.submitButton = page.locator('#submit_file_button');
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

       /* const textEntryTab = this.page.getByRole('tab', { name: /Text Entry/i });
        if (await textEntryTab.isVisible().catch(() => false)) {
            await textEntryTab.click();
            await this.page.waitForTimeout(500); // Wait for tab transition
        }*/

       /* const textEntryTab = this.page.getByRole('tab', { name: /Text Entry/i });
        if (await textEntryTab.isVisible().catch(() => false)) {
            console.log("[Canvas Submission] Clicking Text Entry tab...");
            await textEntryTab.click();
            // Wait for the UI to transition and the form to become visible
            await this.page.waitForTimeout(1000); 
        }

        //const iframe = this.page.frameLocator('iframe[title*="Rich Text Area"]').first();
       // const plainTextArea = this.page.locator('textarea#submission_body'); // Specific ID for Canvas Text Entry
        const iframe = this.page.frameLocator('iframe[title*="Rich Text Area"]').first();
        const plainTextArea = this.page.locator('textarea#submission_body');

        // Try Rich Text Editor first
        if (await this.page.locator('iframe[title*="Rich Text Area"]').first().isVisible().catch(() => false)) {
            const iframeBody = iframe.locator('body');
            await expect(iframeBody).toBeVisible({ timeout: 10000 });
            await iframeBody.fill(text);
        } else {
            // Fallback to plain textarea (ID #submission_body)
            // before checking visibility. Canvas sometimes toggles these.
            await plainTextArea.waitFor({ state: 'attached', timeout: 15000 });
            if (!(await plainTextArea.isVisible())) {
                console.log("[Canvas Submission] Textarea not visible, attempting to force visibility via click...");
                await textEntryTab.click({ force: true });
                await this.page.click('body'); // Click out to trigger UI refresh
            }
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
            /*if (!filePath) {
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
            break;*/

            // If we have text content, prioritize Text Entry to avoid file system issues
           /* if (text) {
                await this.fillTextEntry(text);
            } else if (filePath) {
                const fileUploadTab = this.page.getByRole('tab', { name: /File Upload/i });
                if (await fileUploadTab.isVisible().catch(() => false)) {
                    await fileUploadTab.click();
                    await this.page.waitForTimeout(500);
                }
                await this.uploadFile(filePath);
            } else {
                throw new Error(`Either filePath or text is required for .txt submission`);
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

        //await expect(this.fileUploadInput).toBeVisible({ timeout: 10000 });
        await expect(this.fileUploadInput).toBeAttached({ timeout: 10000 });
    }

    async submitAssignment(): Promise<void> {
        /*await expect(this.submitButton).toBeVisible({ timeout: 30000 });
        await expect(this.submitButton).toBeEnabled({ timeout: 10000 });

        await this.submitButton.scrollIntoViewIfNeeded();
        //await this.submitButton.click();
        await this.submitButton.waitFor({ state: 'visible', timeout: 30000 });
        await this.submitButton.click({ force: true });

        await this.page.waitForTimeout(2000);

        try {
        await this.page.waitForURL(/.*\/submissions.*///, //{ timeout: 5000 }).catch(() => {});
        //} catch {
        // URL might not change, continue
       // }

      /* console.log("[DEBUG] submitAssignment: Waiting for #submit_file_button...");
        try {
            await expect(this.submitButton).toBeVisible({ timeout: 20000 });
            await expect(this.submitButton).toBeEnabled({ timeout: 10000 });

            console.log("[DEBUG] submitAssignment: Button is ready. Clicking...");
            await this.submitButton.scrollIntoViewIfNeeded();
            await this.submitButton.click({ force: true });
            
            console.log("[DEBUG] submitAssignment: Click successful. Waiting for redirect...");
            await this.page.waitForTimeout(2000);

            await this.page.waitForURL(/.*\/submissions.*///, { timeout: 10000 }).catch(() => {
               /* console.log("[DEBUG] submitAssignment: URL did not change, but proceeding to verify sidebar.");
            });
        } catch (e: any) {
            console.error(`[ERROR] submitAssignment failed: ${e.message}`);
            throw e;
        }
    }

    

    async verifySubmissionSuccess(): Promise<void> {
        await expect(this.submissionSidebar).toBeVisible({ timeout: 30000 });
        await expect(this.submittedText).toBeVisible({ timeout: 30000 });
    }
    }*/

import { expect, Page, Locator } from '@playwright/test';//
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
        this.fileUploadInput = page.locator('input[data-testid="file-upload-0"]');
        this.submissionCommentTextarea = page.locator('textarea#submission_comment');
        
        // Use the specific ID found in your DOM inspection
       // this.submitButton = page.locator('#submit_file_button');
        //this.submitButton = page.locator('button[type="submit"].btn-primary, #submit_file_button');
        this.submitButton = page.getByRole('button', { name: 'Submit Assignment' });
       // this.submitButton = page.locator('#submit_assignment .btn-primary[type="submit"], #submit_file_button').first();
        this.cancelButton = page.locator('button.cancel_button');

        this.submissionSidebar = page.locator('#sidebar_content');
        this.submittedText = this.submissionSidebar.getByText('Submitted!');
    }

    async waitForLoad(): Promise<void> {
        // Ensure the submission container is attached before proceeding
        await this.submissionForm.waitFor({ state: 'attached', timeout: 20000 });
        await this.page.waitForTimeout(500);
    }

    async uploadFile(filePath: string): Promise<void> {
        await this.waitForLoad();

        const fileUploadTab = this.page.getByRole('tab', { name: /File Upload/i });
        if (await fileUploadTab.isVisible().catch(() => false)) {
            await fileUploadTab.click();
        }

        await this.fileUploadInput.waitFor({ state: 'attached', timeout: 30000 });
        await this.fileUploadInput.setInputFiles(filePath);
        await this.page.waitForTimeout(1000);
    }

    /*async fillTextEntry(text: string): Promise<void> {
        await this.waitForLoad();

        const textEntryTab = this.page.getByRole('tab', { name: /Text Entry/i });
        if (await textEntryTab.isVisible().catch(() => false)) {
            console.log("[Canvas Submission] Clicking Text Entry tab...");
            await textEntryTab.click({ force: true });
            //await this.page.waitForTimeout(1500); 
            await Promise.race([
                this.page.waitForSelector('form#submit_online_text_entry_form', { state: 'visible', timeout: 15000 }),
                this.page.waitForSelector('iframe#submission_body_ifr', { state: 'attached', timeout: 15000 }),
                this.page.waitForSelector('textarea#submission_body', { state: 'attached', timeout: 15000 }),
            ]);
        }

        //const iframeLocator = this.page.locator('iframe[title*="Rich Text Area"]').first();
        const iframeLocator = this.page.locator('iframe#submission_body_ifr');

       const plainTextArea = this.page.locator('textarea#submission_body');


        // 🎯 STABILITY FIX: Check for existence (count), not visibility.
        // If the iframe exists in the DOM, the plain textarea is programmatically hidden by Canvas.
        const isRichEditorPresent = await iframeLocator.count() > 0;

        if (isRichEditorPresent) {
            console.log("[Canvas Submission] Rich Editor detected. Waiting for visibility...");
            //const iframeBody = this.page.frameLocator('iframe[title*="Rich Text Area"]').first().locator('body');
            const iframeBody = this.page.frameLocator('iframe#submission_body_ifr').locator('body#tinymce')

            await iframeBody.waitFor({ state: 'visible', timeout: 15000 });
            await iframeBody.fill(text);
        } else {
            console.log("[Canvas Submission] Using plain textarea.");
            await plainTextArea.waitFor({ state: 'visible', timeout: 15000 });
            await plainTextArea.fill(text);
        }
        await this.page.waitForTimeout(500);
    }*/

    async fillTextEntry(text: string): Promise<void> {
        await this.waitForLoad();

        const textEntryTab = this.page.getByRole('tab', { name: /Text Entry/i });
        if (await textEntryTab.isVisible().catch(() => false)) {
            console.log("[Canvas Submission] Clicking Text Entry tab...");
            await textEntryTab.click({ force: true });
        }

        await Promise.race([
            this.page.waitForSelector('form#submit_online_text_entry_form', { state: 'visible', timeout: 15000 }),
            this.page.waitForSelector('iframe#submission_body_ifr', { state: 'attached', timeout: 15000 }),
            this.page.waitForSelector('textarea#submission_body', { state: 'attached', timeout: 15000 }),
        ]);

        const iframeLocator = this.page.locator('iframe#submission_body_ifr');
        const plainTextArea = this.page.locator('textarea#submission_body');

        const richEditorVisible = await iframeLocator.isVisible().catch(() => false);
        const plainTextareaVisible = await plainTextArea.isVisible().catch(() => false);

        if (richEditorVisible) {
            console.log("[Canvas Submission] Rich Editor visible. Using iframe...");
            const iframeBody = this.page
                .frameLocator('iframe#submission_body_ifr')
                .locator('body#tinymce');

            await iframeBody.waitFor({ state: 'visible', timeout: 15000 });
            await iframeBody.fill(text);
        } else if (plainTextareaVisible) {
            console.log("[Canvas Submission] Plain textarea visible. Using textarea...");
            await plainTextArea.fill(text);
        } else {
            throw new Error('Neither rich text editor nor plain textarea is visible after opening Text Entry.');
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
                if (!filePath) throw new Error(`File path required for ${submissionType}`);
                await this.uploadFile(filePath);
                break;
            }
            case '.txt': {
                if (!filePath) throw new Error(`File path required for ${submissionType}`);
                await this.uploadFile(filePath);
                break;
            }
            case 'Text Entry': {
                if (!text) throw new Error('Text content required for Text Entry');
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
            //const iframeLocator = this.page.locator('iframe[title*="Rich Text Area"]').first();
            const iframeLocator = this.page.locator('iframe#submission_body_ifr');

            const plainTextArea = this.page.locator('textarea#submission_body');

           // if (await iframeLocator.isVisible().catch(() => false)) {
              //  const bodyText = await this.page.frameLocator('iframe[title*="Rich Text Area"]').first().locator('body').textContent();
            if (await iframeLocator.count() > 0) {
                    const bodyText = await this.page.frameLocator('iframe#submission_body_ifr').locator('body#tinymce').textContent();
                if (!bodyText || bodyText.trim() === '') throw new Error('Text entry content is empty');
            } else {
                await expect(plainTextArea).toBeVisible({ timeout: 10000 });
                await expect(plainTextArea).not.toHaveValue('');
            }
        } else {
            await expect(this.fileUploadInput).toBeAttached({ timeout: 10000 });
        }
    }

    async submitAssignment(): Promise<void> {
      //  console.log("[DEBUG] submitAssignment: Waiting for #submit_file_button...");
        try {
            await expect(this.submitButton).toBeVisible({ timeout: 20000 });
            //await expect(this.submitButton).toBeEnabled({ timeout: 10000 });

            console.log("[DEBUG] submitAssignment: Button is ready. Clicking...");
            await this.submitButton.click({ force: true });
            
            console.log("[DEBUG] submitAssignment: Click successful. Waiting for redirect...");
            
            // Allow time for Canvas to process the submission
        //await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

            
           await this.page.waitForURL(/.*\/submissions.*/, { timeout: 10000 }).catch(() => {
                console.log("[DEBUG] submitAssignment: URL change timeout, proceeding to sidebar verification.");
            });
        } catch (e: any) {
            console.error(`[ERROR] submitAssignment failed: ${e.message}`);
            throw e;
        }
    }
    

    async verifySubmissionSuccess(): Promise<void> {
        await expect(this.submissionSidebar).toBeVisible({ timeout: 30000 });
        await expect(this.submittedText).toBeVisible({ timeout: 30000 });
    }
}