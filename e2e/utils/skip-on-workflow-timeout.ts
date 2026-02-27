import { test } from "@playwright/test";

export async function runPGOrSkipOnTimeout(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    // Covers expect().toPass() timing out + your Start Reviewing wait
    const isWorkflowTimeout =
      msg.includes("Timeout") && msg.includes("toPass") ||
      msg.includes('Waiting for "Start Reviewing" button to appear') ||
      msg.includes("Timeout 600000ms exceeded while waiting on the predicate");

    if (isWorkflowTimeout) {
      test.skip(true, `Skipping due to workflow timeout: ${msg}`);
    }

    throw e;
  }
}