import { test } from '@playwright/test';
import { Page } from '@playwright/test';

export class AllureHelper {
    static async attachScreenshot(page: Page, name: string): Promise<void> {
        const screenshot = await page.screenshot();
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

    static step(name: string, body: () => Promise<void> | void): Promise<void> {
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

