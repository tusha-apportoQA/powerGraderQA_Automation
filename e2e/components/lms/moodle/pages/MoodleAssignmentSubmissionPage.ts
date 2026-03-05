import { expect, Page, Locator } from '@playwright/test';
import { FormatType } from '../../../../types';

/**
 * Moodle assignment edit submission page (view.php?id=X&action=editsubmission).
 * Contains the file manager for file submissions and (when applicable) text entry.
 */
export class MoodleAssignmentSubmissionPage {
    page: Page;
    mainContent: Locator;
    /** File submissions file manager container. */
    fileManagerContainer: Locator;
    /** "Add..." button in the file manager toolbar (opens repository picker). */
    fileManagerAddButton: Locator;
    /** "Save changes" button to complete the submission. */
    saveChangesButton: Locator;
    /** Online text editor contenteditable (Atto editor). */
    onlineTextEditor: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mainContent = page.getByRole('main');
        this.fileManagerContainer = page.locator('#fitem_id_files_filemanager');
        this.fileManagerAddButton = this.fileManagerContainer.getByRole('button', { name: 'Add...' });
        this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
        this.onlineTextEditor = page.locator('#id_onlinetext_editoreditable');
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForURL(/\/mod\/assign\/view\.php\?id=\d+&action=editsubmission/, { timeout: 30000 });
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
        await this.page.waitForTimeout(1000);
    }

    async expectEditSubmissionPageLoaded(): Promise<void> {
        await expect(this.page).toHaveURL(/\/mod\/assign\/view\.php\?id=\d+&action=editsubmission/);
        await expect(this.mainContent).toBeVisible({ timeout: 10000 });
    }

    /**
     * Upload a file for file submissions: click Add in file manager, choose "Upload a file", set file.
     * File input is scoped to the upload dialog so we target the correct one (works for .docx, .pdf, .txt).
     */
    async uploadFile(filePath: string): Promise<void> {
        await this.expectEditSubmissionPageLoaded();
        await expect(this.fileManagerContainer).toBeVisible({ timeout: 10000 });

        await this.fileManagerAddButton.click();
        await this.page.waitForTimeout(500);

        const uploadLink = this.page.getByRole('link', { name: 'Upload a file' });
        await expect(uploadLink).toBeVisible({ timeout: 10000 });
        await uploadLink.click();
        await this.page.waitForTimeout(800);

        // Use the last file input (upload form's input appears last). Do not click it – that opens the native file picker.
        const fileInput = this.page.locator('input[type="file"]').last();
        await expect(fileInput).toBeVisible({ timeout: 10000 });
        await fileInput.setInputFiles(filePath);

        const uploadThisFileButton = this.page.getByRole('button', { name: 'Upload this file' });
        await expect(uploadThisFileButton).toBeVisible({ timeout: 10000 });
        await expect(uploadThisFileButton).toBeEnabled({ timeout: 15000 });
        await uploadThisFileButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Fill the online text entry (Atto editor contenteditable).
     */
    async fillTextEntry(text: string): Promise<void> {
        await this.expectEditSubmissionPageLoaded();
        await expect(this.onlineTextEditor).toBeVisible({ timeout: 10000 });
        await this.onlineTextEditor.click();
        await this.onlineTextEditor.fill(text);
        await this.page.waitForTimeout(300);
    }

    /**
     * Click "Save changes" to complete the submission.
     */
    async clickSaveChanges(): Promise<void> {
        await this.expectEditSubmissionPageLoaded();
        await expect(this.saveChangesButton).toBeVisible({ timeout: 10000 });
        await expect(this.saveChangesButton).toBeEnabled({ timeout: 5000 });
        await this.saveChangesButton.click();
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Prepare submission based on type (mirrors Canvas prepareSubmission).
     * File types (.docx, .pdf, .txt): upload file. Text Entry: fill online text editor.
     */
    async prepareSubmission(
        submissionType: FormatType,
        filePath?: string,
        text?: string
    ): Promise<void> {
        await this.expectEditSubmissionPageLoaded();

        switch (submissionType) {
            case '.docx':
            case '.pdf':
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
}
