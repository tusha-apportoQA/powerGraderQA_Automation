import { expect, Page } from '@playwright/test';

/** After the shared pool pass, keep this many newest rows (by `[timestamp]` in title; missing → 0). */
const KEEP_LATEST_IN_POOL = 10;

/** Progress cell text like `1/1` or `0/0`; returns numerator or null if not matched. */
function parseProgressNumerator(progressText: string): number | null {
    const m = progressText.trim().match(/^(\d+)\s*\/\s*(\d+)/);
    if (!m) return null;
    return parseInt(m[1], 10);
}

/** Parses `{base} [numeric]` from the assignment title cell. */
function parseAutomationRowTitle(
    raw: string,
    base: string
): { fullTitle: string; timestamp: number } | null {
    const t = raw.replace(/\s+/g, ' ').trim();
    if (!t.startsWith(base)) {
        return null;
    }
    const afterBase = t.slice(base.length).trim();
    if (!afterBase.startsWith('[')) {
        return null;
    }
    const closeIdx = afterBase.indexOf(']');
    if (closeIdx === -1) {
        return null;
    }
    const id = afterBase.slice(1, closeIdx);
    if (id === '' || !/^\d+$/.test(id)) {
        return null;
    }
    if (afterBase.slice(closeIdx + 1).trim() !== '') {
        return null;
    }
    return { fullTitle: `${base} [${id}]`, timestamp: parseInt(id, 10) };
}

export class PowerGraderCoursePage {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        await this.page.waitForTimeout(1000);
    }

    async expectCoursePageLoaded(): Promise<void> {
        await this.waitForLoad();
    }

    /** Non-blocking: clicks "Sync now" when visible and enabled; skips on cooldown or failure. */
    async clickSyncNowIfAvailable(label = 'Course Page'): Promise<void> {
        try {
            const syncNowBtn = this.page.getByRole('button', { name: 'Sync now' });
            const syncNowVisible = await syncNowBtn.isVisible({ timeout: 5000 });
            const syncNowEnabled = syncNowVisible && await syncNowBtn.isEnabled();
            if (syncNowVisible && syncNowEnabled) {
                console.log(`[${label}] "Sync now" is visible and enabled. Triggering immediate LMS sync...`);
                await syncNowBtn.click();
                console.log(`[${label}] "Sync now" clicked.`);
            } else {
                console.log(
                    `[${label}] "Sync now" skipped (visible: ${syncNowVisible}, enabled: ${syncNowEnabled}). Continuing with normal sync polling...`,
                );
            }
        } catch (error) {
            console.log(
                `[${label}] "Sync now" step failed (non-blocking):`,
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    /**
     * Rows whose first `td` contains a base title: if progress parses and is `> 0` → delete list; else → pool.
     * After all bases, the pool is sorted by timestamp (from title, else 0); newest `KEEP_LATEST_IN_POOL` stay,
     * the rest join the delete list.
     */
    async getAutomationCleanupAssignmentTitles(baseTitles?: string[]): Promise<string[]> {
        const defaultAutomationBaseTitles: string[] = [
            'Short Accurate No Rubric DOCX',
            'Long Accurate Existing Rubric PDF',
            'Short Inaccurate New Rubric TXT',
            'Short Inaccurate Existing Rubric Text Entry',
        ];
        const prefixes = baseTitles ?? defaultAutomationBaseTitles;
        const searchInput = this.page.locator('input[placeholder*="Search titles"]').first();
        await expect(searchInput).toBeVisible({ timeout: 30000 });
        await searchInput.clear();
        await this.page.waitForTimeout(500);

        const toDelete = new Set<string>();
        const pool: { title: string; timestamp: number }[] = [];

        for (const base of prefixes) {
            const rows = this.page.locator('tr').filter({
                has: this.page.locator('td').first().filter({ hasText: base }),
            });
            const rowCount = await rows.count();

            for (let i = 0; i < rowCount; i++) {
                const row = rows.nth(i);
                if (!(await row.isVisible().catch(() => false))) {
                    continue;
                }

                const cells = row.locator('td');
                if ((await cells.count()) < 4) {
                    continue;
                }

                const titleRaw = (await cells.nth(0).innerText()).replace(/\s+/g, ' ').trim();
                const parsed = parseAutomationRowTitle(titleRaw, base);
                const progressNumerator = parseProgressNumerator(await cells.nth(3).innerText());

                if (progressNumerator !== null && progressNumerator > 0) {
                    toDelete.add(parsed?.fullTitle ?? titleRaw);
                } else {
                    pool.push({
                        title: parsed?.fullTitle ?? titleRaw,
                        timestamp: parsed?.timestamp ?? 0,
                    });
                }
            }
        }

        pool.sort((a, b) => b.timestamp - a.timestamp);
        for (const e of pool.slice(KEEP_LATEST_IN_POOL)) {
            toDelete.add(e.title);
        }

        return [...toDelete];
    }

    async clickViewButtonForAssignment(assignmentTitle: string): Promise<void> {
        const assignmentText = this.page.getByText(assignmentTitle, { exact: false }).first();
        await expect(assignmentText).toBeVisible({ timeout: 30000 });
        
        const tableRow = assignmentText.locator('xpath=ancestor::tr').first();
        const viewButton = tableRow.getByRole('button', { name: 'View details' }).first();
        
        await expect(viewButton).toBeVisible({ timeout: 10000 });
        
        await Promise.all([
            this.page.waitForURL(/\/assignments\/RegisterAssignmentPublicUUID--/, { timeout: 30000 }),
            viewButton.click()
        ]);
        
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    }

}

