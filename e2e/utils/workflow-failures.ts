import { Page } from '@playwright/test';
import { AllureHelper } from './allureHelper';

export type WorkflowFailure = {
    message: string;
    tag: string;
    caseId?: string;
    caseLabel?: string;
};

export type CreateWorkflowFailureOptions = {
    tag: string;
    caseId?: string;
    caseLabel?: string;
    /** Page to screenshot + attach URL context (deferred failures skip Playwright auto-screenshots). */
    page?: Page;
};

function resolveCaseId(options: CreateWorkflowFailureOptions): string | undefined {
    if (options.caseId) {
        return options.caseId;
    }
    if (options.caseLabel) {
        return options.caseLabel.split(':')[0];
    }
    return undefined;
}

function logDeferredWorkflowFailure(
    error: unknown,
    options: CreateWorkflowFailureOptions,
    failure: WorkflowFailure,
    resolvedCaseId: string | undefined,
): void {
    const prefix = resolvedCaseId ?? options.tag;
    const scope = options.tag === 'IG' ? '[IG Workflow]' : `[${options.tag}]`;
    console.error(`${scope} ❌ ${prefix} FAILED (deferred):`, failure.message);
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
}

/**
 * Records a deferred workflow failure (labels + log) and optionally attaches screenshot/URL
 * diagnostics for Allure. Prefer passing `page` for UI failures so hub reports show the stuck state.
 */
export async function createWorkflowFailure(
    error: unknown,
    options: CreateWorkflowFailureOptions,
): Promise<WorkflowFailure> {
    const resolvedCaseId = resolveCaseId(options);
    const failure: WorkflowFailure = {
        message: error instanceof Error ? error.message : String(error),
        tag: options.tag,
        caseId: resolvedCaseId,
        caseLabel: options.caseLabel,
    };

    logDeferredWorkflowFailure(error, options, failure, resolvedCaseId);

    if (resolvedCaseId) {
        AllureHelper.label('caseStatus', `${resolvedCaseId}:failed`);
        AllureHelper.label('caseError', `${resolvedCaseId}:${failure.message}`);
    }

    if (options.page) {
        const diagLabel = [resolvedCaseId, options.tag, 'failure'].filter(Boolean).join('|');
        await AllureHelper.attachFailureDiagnostics(options.page, diagLabel, {
            error: failure.message,
        });
    }

    return failure;
}

export function formatWorkflowFailure(failure: WorkflowFailure): string {
    const prefix = failure.caseId ?? failure.tag;
    return `  - ${prefix}: ${failure.message}`;
}

export function buildWorkflowFailures(failures: WorkflowFailure[]): string[] {
    return failures.map(formatWorkflowFailure);
}

/** Universal title when orchestration throws combined SBERT + LMS + IG failures. */
export const ORCHESTRATION_FAILURE_TITLE = 'Orchestration failed';

export function buildWorkflowFailureError(
    failures: WorkflowFailure[],
    title: string = ORCHESTRATION_FAILURE_TITLE,
): Error | null {
    const errors = buildWorkflowFailures(failures);
    if (errors.length === 0) {
        return null;
    }
    const failureLabel = errors.length === 1 ? 'failure' : 'failures';
    return new Error(`${title} (${errors.length} ${failureLabel}):\n${errors.join('\n')}`);
}
