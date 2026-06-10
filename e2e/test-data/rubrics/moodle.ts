/**
 * Moodle LMS rubric configurations
 * Same structure as Canvas new rubrics, but without maxPoints and longDescription on criteria and ratings.
 */

import type { MoodleExistingRubricConfig, MoodleNewRubricConfig } from '../../types';

/**
 * Predefined existing rubric configurations for Moodle
 * These rubrics should already exist in Moodle
 */
export const MOODLE_EXISTING_RUBRICS: MoodleExistingRubricConfig[] = [
    {
        type: 'existing',
        rubricName: 'ELC Essay Rubric'
    },
    {
        type: 'existing',
        rubricName: 'Sales Data Rubric'
    }
];

/**
 * Predefined new rubric configurations for Moodle
 * Different criteria can have different numbers of levels (ratings).
 */
export const MOODLE_NEW_RUBRICS: MoodleNewRubricConfig[] = [
    {
        type: 'new',
        title: 'Essay Grading Rubric',
        criteria: [
            { description: 'Content Quality', ratings: [{ points: 10, description: 'Excellent' }, { points: 7, description: 'Good' }, { points: 4, description: 'Fair' }, { points: 0, description: 'Poor' }] },  // 4 levels
            { description: 'Grammar and Style', ratings: [{ points: 5, description: 'Perfect' }, { points: 3, description: 'Good' }, { points: 0, description: 'Needs improvement' }] },  // 3 levels
            { description: 'Organization', ratings: [{ points: 5, description: 'Clear structure' }, { points: 0, description: 'Weak structure' }] }  // 2 levels
        ]
    },
    {
        type: 'new',
        title: 'Technology Impact Assessment Rubric',
        criteria: [
            { description: 'Analysis Depth', ratings: [{ points: 15, description: 'Excellent' }, { points: 10, description: 'Good' }, { points: 5, description: 'Fair' }, { points: 0, description: 'Poor' }] },  // 4 levels
            { description: 'Personal Examples', ratings: [{ points: 10, description: 'Excellent' }, { points: 6, description: 'Good' }, { points: 0, description: 'Poor' }] },  // 3 levels
            { description: 'Writing Quality', ratings: [{ points: 5, description: 'Excellent' }, { points: 4, description: 'Good' }, { points: 2, description: 'Fair' }, { points: 1, description: 'Weak' }, { points: 0, description: 'Poor' }] }  // 5 levels
        ]
    },
    {
        type: 'new',
        title: 'Sales Data Rubric',
        criteria: [
            {
                description: 'Data Completeness',
                ratings: [
                    { points: 10, description: 'Excellent' },
                    { points: 7, description: 'Good' },
                    { points: 4, description: 'Fair' },
                    { points: 0, description: 'Poor' },
                ],
            },
            {
                description: 'Data Accuracy',
                ratings: [
                    { points: 15, description: 'Excellent' },
                    { points: 10, description: 'Good' },
                    { points: 5, description: 'Fair' },
                    { points: 0, description: 'Poor' },
                ],
            },
            {
                description: 'Organization and Formatting',
                ratings: [
                    { points: 5, description: 'Excellent' },
                    { points: 3, description: 'Good' },
                    { points: 1, description: 'Fair' },
                    { points: 0, description: 'Poor' },
                ],
            },
        ],
    },
    {
        type: 'new',
        title: 'Employee Performance Rubric',
        criteria: [
            {
                description: 'Spreadsheet Completeness',
                ratings: [
                    { points: 10, description: 'Excellent' },
                    { points: 7, description: 'Good' },
                    { points: 4, description: 'Fair' },
                    { points: 0, description: 'Poor' },
                ],
            },
            {
                description: 'Performance Evaluation Accuracy',
                ratings: [
                    { points: 15, description: 'Excellent' },
                    { points: 10, description: 'Good' },
                    { points: 5, description: 'Fair' },
                    { points: 0, description: 'Poor' },
                ],
            },
            {
                description: 'Professional Structure',
                ratings: [
                    { points: 5, description: 'Excellent' },
                    { points: 3, description: 'Good' },
                    { points: 1, description: 'Fair' },
                    { points: 0, description: 'Poor' },
                ],
            },
        ],
    },
];
