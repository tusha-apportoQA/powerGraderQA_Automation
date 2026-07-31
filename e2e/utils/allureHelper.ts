import { test } from '@playwright/test';
import { Page } from '@playwright/test';
import { allure } from 'allure-playwright';

export class AllureHelper {
    static async attachScreenshot(page: Page, name: string): Promise<void> {
        const screenshot = await page.screenshot({ fullPage: false });
        await test.info().attach(name, {
            body: screenshot,
            contentType: 'image/png'
        });
    }

    static async attachText(name: string, content: string): Promise<void> {
        await test.info().attach(name, {
            body: content,
            contentType: 'text/plain'
        });
    }

    static async attachJSON(name: string, data: any): Promise<void> {
        await test.info().attach(name, {
            body: JSON.stringify(data, null, 2),
            contentType: 'application/json'
        });
    }

    /**
     * Failure-only diagnostics for deploy/hub: screenshot + URL/context text.
     * Safe to call when page may be closed; never throws.
     */
    static async attachFailureDiagnostics(
        page: Page | undefined,
        label: string,
        extra?: { error?: string; waitingFor?: string },
    ): Promise<void> {
        const safeLabel = label.replace(/[^\w.\-| ]+/g, '_').slice(0, 140);
        try {
            if (!page || page.isClosed()) {
                console.warn(`[AllureHelper] Skipping failure diagnostics for "${safeLabel}" (page missing/closed)`);
                return;
            }
            const lines = [
                `label: ${safeLabel}`,
                `url: ${page.url()}`,
                `timestamp: ${new Date().toISOString()}`,
            ];
            if (extra?.waitingFor) {
                lines.push(`waitingFor: ${extra.waitingFor}`);
            }
            if (extra?.error) {
                lines.push(`error: ${extra.error}`);
            }
            await this.attachText(`${safeLabel} | context`, lines.join('\n'));
            await this.attachScreenshot(page, `${safeLabel} | screenshot`);
        } catch (e) {
            console.warn(`[AllureHelper] Could not attach failure diagnostics for "${safeLabel}":`, e);
        }
    }

    static step<T>(name: string, body: () => Promise<T> | T): Promise<T> {
        return test.step(name, body);
    }

      //timing / metrics parameter support
    static parameter(name: string, value: string | number | boolean): void {
        test.info().annotations.push({
            type: name,
            description: String(value)
        });
    }


    static label(name: string, value: string): void {
        // Write as real Allure labels so they appear in *-result.json labels array.
        void allure.label(name, value);
        // Keep annotation for local/debug compatibility with existing logic.
        test.info().annotations.push({ type: name, description: value });
    }

    static description(description: string): void {
        test.info().annotations.push({ type: 'description', description });
    }

    static epic(epic: string): void {
        test.info().annotations.push({ type: 'epic', description: epic });
    }

    static feature(feature: string): void {
        test.info().annotations.push({ type: 'feature', description: feature });
    }

    static story(story: string): void {
        test.info().annotations.push({ type: 'story', description: story });
    }

    static severity(severity: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial'): void {
        test.info().annotations.push({ type: 'severity', description: severity });
    }
}
