import { GradingSummary } from '../types';

/** Normalize scraped grading data so order/whitespace differences don't break equality checks. */
export function normalizeGradingSummary(summary: GradingSummary): GradingSummary {
    return {
        totalScore: summary.totalScore.trim(),
        overallFeedback: (summary.overallFeedback ?? '').trim(),
        criteria: [...summary.criteria]
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((criterion) => ({
                name: criterion.name.trim(),
                points: criterion.points,
                feedback: criterion.feedback.trim(),
            })),
    };
}

/** True when two grading summaries match after normalization. */
export function gradingSummariesMatch(a: GradingSummary, b: GradingSummary): boolean {
    return JSON.stringify(normalizeGradingSummary(a)) === JSON.stringify(normalizeGradingSummary(b));
}
