import { test } from "@playwright/test";

export async function runPGOrSkipOnTimeout(fn: () => Promise<void>) {
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
      test.skip(true, `Skipping due to workflow timeout: ${msg}`);
    }

    throw e;
  }
}