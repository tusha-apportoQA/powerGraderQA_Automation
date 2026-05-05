import { expect, Page, Locator } from '@playwright/test';
import { GradingSummary } from '../../../../types';

export class D2LGradingPage {
    page: Page;
    pageHeading: Locator;
    rubricHeading: Locator;
    rubric: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageHeading = page.locator('h1, h2').first();
        this.rubricHeading = page.getByRole('heading', { name: /rubric/i });
        this.rubric = page.locator('d2l-rubric');
    }

    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.pageHeading).toBeVisible({ timeout: 30000 });
    }

    /**
     * Assert the rubric section heading is visible on the grading page.
     */
    async expectRubricHeadingVisible(): Promise<void> {
        await expect(
            this.rubricHeading,
            'Expected rubric heading to be visible on grading page'
        ).toBeVisible({ timeout: 30000 });
    }

    /**
     * Expand the rubric by clicking the d2l-rubric element, then assert it has
     * the compact-expanded attribute (expanded state).
     */
    async expandRubricAndExpectExpanded(): Promise<void> {
        await expect(this.rubric, 'Expected d2l-rubric to be visible').toBeVisible({ timeout: 30000 });
        await this.rubric.click();
        await this.page.waitForLoadState('domcontentloaded');
        // compact-expanded is set when the rubric is expanded (boolean attribute)
        await expect(
            this.rubric,
            'Expected d2l-rubric to have attribute compact-expanded after expand'
        ).toHaveAttribute('compact-expanded');
    }

    /**
     * Extract total rubric score and per-criterion scores/feedback from the D2L grading page.
     * Uses page-level locators so slotted rubric content is found.
     */
    async getRubricSnapshot(): Promise<GradingSummary> {
        await this.waitForLoad();
        await this.expectRubricHeadingVisible();
        await this.expandRubricAndExpectExpanded();

        // Confirm we're on the Rubrics panel (block with "Rubrics" h3)
        const rubricPanelBlock = this.page
            .locator('div.d2l-consistent-evaluation-right-panel-block')
            .filter({ has: this.page.getByRole('heading', { name: 'Rubrics' }) })
            .first();
        await expect(rubricPanelBlock).toBeVisible({ timeout: 10000 });


        await this.page.waitForTimeout(800);
        const totalScoreEl = this.page.locator('d2l-rubric-total-score').first();
        await totalScoreEl.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

        // --- Total score: d2l-rubric-total-score → input#text-area + div#out-of (or aria-label fallback) ---
        let totalScoreValue = '';
        let totalOutOf = '';
        const totalInput = totalScoreEl.locator('input#text-area').first();
        if (await totalInput.count().then(n => n > 0)) {
            totalScoreValue =
                (await totalInput.inputValue().catch(() => '')) ||
                (await totalInput.getAttribute('value').catch(() => '')) ||
                (await totalInput.evaluate((el: unknown) => (el as { value?: string })?.value ?? '').catch(() => '')) ||
                '';
            const outOfDiv = totalScoreEl.locator('div#out-of').first();
            totalOutOf = (await outOfDiv.innerText().catch(() => '')).trim();
            if (!totalOutOf && (await outOfDiv.count()) > 0) {
                totalOutOf = (await outOfDiv.textContent().catch(() => '') ?? '').trim();
            }
        }
        if (!totalScoreValue || !totalOutOf) {
            const ariaLabel = await totalScoreEl.locator('h4.out-of-text[aria-label]').first().getAttribute('aria-label').catch(() => '');
            const match = ariaLabel?.match(/([\d.]+)\s+out\s+of\s+(\d+)/i);
            if (match) {
                totalScoreValue = totalScoreValue || match[1];
                totalOutOf = totalOutOf || match[2];
            }
        }

        // --- Criteria: single deterministic path from each criterion container ---
        const criteria: Array<{ name: string; score: string; outOf: string; feedback: string }> = [];
        const allCriteria = this.page.locator('d2l-rubric-criterion-mobile');
        await allCriteria.first().waitFor({ state: 'attached', timeout: 15000 });
        const count = await allCriteria.count();
        for (let i = 0; i < count; i++) {
            const criterion = allCriteria.nth(i);

            const name = (await criterion.locator('#criterion-name-text').first().innerText()).trim();
            const scoreInput = criterion.locator('input[aria-label="Edit score"]').first();
            await scoreInput.waitFor({ state: 'attached', timeout: 10000 });
            const scoreValue = (await scoreInput.inputValue()).trim();

            const outOfEl = criterion.locator('div#out-of').first();
            await outOfEl.waitFor({ state: 'attached', timeout: 10000 });
            const outOfText = (await outOfEl.innerText()).trim();

            const feedback = (
                await criterion
                    .locator('d2l-rubric-feedback d2l-html-block .d2l-html-block-rendered p')
                    .first()
                    .innerText()
            ).trim();

            criteria.push({ name, score: scoreValue, outOf: outOfText, feedback });
        }

        const outOfNum = String(totalOutOf).match(/[\d.]+/)?.[0] ?? '';
        const summary: GradingSummary = {
            totalScore: outOfNum ? `${totalScoreValue}/${outOfNum}` : String(totalScoreValue),
            criteria: criteria.map((c) => ({
                name: c.name,
                points: Number(String(c.score).match(/[\d.]+/)?.[0] ?? NaN),
                feedback: c.feedback,
            })),
        };

        console.log('[D2LGradingPage] LMS GradingSummary (scraped):', summary);
        return summary;
    }

    /**
     * True if at least one element has this exact text and the **first** match is visible.
     */
    async hasVisibleExactText(expected: string): Promise<boolean> {
        const loc = this.page.getByText(expected, { exact: true });
        if ((await loc.count()) === 0) {
            return false;
        }
        return await loc.first().isVisible().catch(() => false);
    }
}

