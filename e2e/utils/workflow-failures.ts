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

export function createWorkflowFailure(
    error: unknown,
    options: CreateWorkflowFailureOptions,
): WorkflowFailure {
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
