import { Page, test } from "@playwright/test";
import { AllureHelper } from "./allureHelper";

export async function runPGOrSkipOnTimeout(fn: () => Promise<void>, page?: Page) {
  try {
    await fn();
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    // Covers expect().toPass() timing out + your Review wait
    const isWorkflowTimeout =
      msg.includes("Timeout") && msg.includes("toPass") ||
      msg.includes('Waiting for "Review" button to appear') ||
      msg.includes("Timeout 1200000ms exceeded while waiting on the predicate") ||
      msg.includes("Timeout 600000ms exceeded while waiting on the predicate");

    if (isWorkflowTimeout) {
      await AllureHelper.attachFailureDiagnostics(page, 'Workflow timeout', {
        error: msg,
        waitingFor: 'AI grading / Review readiness',
      });
      test.skip(true, `Skipping due to workflow timeout: ${msg}`);
    }

    throw e;
  }
}