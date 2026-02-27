import { expect, Page, Locator } from '@playwright/test';
import path from 'path';
import { FormatType } from '../../../../types';

export class D2LAssignmentSubmissionPage {
    page: Page;
    assignmentHeading: Locator;
    addFileButton: Locator;
    submitButton: Locator;
    cancelButton: Locator;
    submittedText: Locator;
    doneButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.assignmentHeading = page.getByRole('heading', { name: /.*/ });
        this.addFileButton = page.getByRole('button', { name: 'Add a File' });
        this.submitButton = page.getByRole('button', { name: /submit/i }).first();
        this.cancelButton = page.getByRole('button', { name: /cancel/i }).first();
        this.submittedText = page.getByText(/submitted|uploaded|success/i).first();
        this.doneButton = page.locator('d2l-floating-buttons').getByRole('button', { name: 'Done' });
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForURL(/\/d2l\/lms\/dropbox\/user\/folder_submit_files\.d2l/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(500);
    }

    async verifyAssignmentName(expectedTitle: string): Promise<void> {
        const heading = this.page.getByRole('heading', { name: expectedTitle });
        await expect(heading).toBeVisible({ timeout: 30000 });
    }

    async uploadFile(filePath: string): Promise<void> {
        await this.waitForLoad();
        
        await expect(this.addFileButton).toBeVisible({ timeout: 30000 });
        await this.addFileButton.click();
        await this.page.waitForTimeout(1000);
        
        await this.page.waitForTimeout(1000);
        const iframeLocator = this.page.locator('iframe[title^="Add a File"]')
        await expect(iframeLocator).toBeVisible({ timeout: 15000 });
        
        const contentFrame = iframeLocator.contentFrame();
        if (!contentFrame) {
            throw new Error('Unable to access iframe content frame');
        }
        
        const myComputer = contentFrame.locator('div[title="My Computer"]')
        await expect(myComputer).toBeVisible({ timeout: 15000 });
        await myComputer.click();
        await this.page.waitForTimeout(1000);
        
        const uploadButton = contentFrame.getByText('Upload', { exact: true });
        await expect(uploadButton).toBeVisible({ timeout: 15000 });
    
        const [chooser] = await Promise.all([
            this.page.waitForEvent('filechooser'),
            uploadButton.click()
        ]);
    
        await chooser.setFiles(path.resolve(filePath));
        
        const fileName = path.basename(filePath);
        const fileList = contentFrame.locator('ul.d2l-fileinput-filelist');
        await expect(fileList).toBeVisible({ timeout: 30000 });
        
        const fileListItem = fileList.locator(`li[data-d2l-name="${fileName}"]`);
        await expect(fileListItem).toBeVisible({ timeout: 30000 });
        
        await this.page.waitForTimeout(1000);
        
        await this.page.getByRole('button', { name: 'Add' }).click();
        await this.page.waitForTimeout(1000);
    }

    async fillTextEntry(text: string): Promise<void> {
        await this.waitForLoad();

        const iframe = this.page.locator('iframe[title="Text Submission"]');
        await iframe.waitFor({ state: 'attached', timeout: 30000 });
        await expect(iframe).toBeVisible({ timeout: 30000 });
        
        const iframeFrame = this.page.frameLocator('iframe[title="Text Submission"]');
        const tinymceEditor = iframeFrame.locator('#tinymce');
        
        await expect(tinymceEditor).toBeVisible({ timeout: 10000 });
        await tinymceEditor.click();
        await this.page.waitForTimeout(300);
        await tinymceEditor.fill(text);
        await this.page.waitForTimeout(1000);
    }

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
            const iframe = this.page.locator('iframe[title="Text Submission"]');
            await iframe.waitFor({ state: 'attached', timeout: 10000 });
            await expect(iframe).toBeVisible({ timeout: 10000 });
            
            const iframeFrame = this.page.frameLocator('iframe[title="Text Submission"]');
            const tinymceEditor = iframeFrame.locator('#tinymce');
            
            await expect(tinymceEditor).toBeVisible({ timeout: 10000 });
            const editorText = await tinymceEditor.textContent();
            if (!editorText || editorText.trim() === '') {
                throw new Error('Text entry content is empty');
            }
            await this.page.waitForTimeout(1000);
        } else {
            await this.page.waitForTimeout(1000);
        }
    }
    
    async submitAssignment(): Promise<void> {
        await expect(this.submitButton).toBeVisible({ timeout: 30000 });
        await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
        
        await this.submitButton.scrollIntoViewIfNeeded();
        await this.submitButton.click();
        
        // CRITICAL: This 2-second wait ensures the LTI handshake 
        // with PowerGrader is registered before the browser session potentially ends.
        await this.page.waitForTimeout(2000); 
    }

    async verifySubmissionSuccess(): Promise<void> {
        await expect(this.doneButton).toBeVisible({ timeout: 30000 });
        await expect(this.doneButton).toBeEnabled({ timeout: 10000 });
        
        await this.doneButton.click();
        
        await this.page.waitForURL(/\/d2l\/lms\/dropbox\/user\/folders_list\.d2l/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
    }
}

