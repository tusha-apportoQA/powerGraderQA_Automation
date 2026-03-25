    /**
     * Canvas LMS rubric configurations
     * Contains existing and new rubric constant arrays
     */

    import { ExistingRubricConfig, NewRubricConfig } from '../../types';

    /**
     * Predefined existing rubric configurations for Canvas
     * These rubrics should already exist in Canvas
     */
    export const CANVAS_EXISTING_RUBRICS: ExistingRubricConfig[] = [
        {
            type: 'existing',
            groupName: 'CS 202 (Course)',
            rubricName: 'CS rubric'
        },
        {
            type: 'existing',
            groupName: 'Powergrader',
            rubricName: 'Amit tes'
        }
        // Add more existing rubrics as needed
    ];

    /**
     * Predefined new rubric configurations for Canvas
     * These rubrics will be created during test execution
     */
    export const CANVAS_NEW_RUBRICS: NewRubricConfig[] = [
        {
            type: 'new',
            title: 'Essay Grading Rubric',
            criteria: [
                {
                    description: 'Content Quality',
                    longDescription: 'Depth and accuracy of content',
                    maxPoints: 10,
                    ratings: [
                        { points: 10, description: 'Excellent', longDescription: 'Comprehensive and accurate' },
                        { points: 7, description: 'Good', longDescription: 'Mostly accurate with minor gaps' },
                        { points: 4, description: 'Fair', longDescription: 'Some inaccuracies present' },
                        { points: 0, description: 'Poor', longDescription: 'Significant inaccuracies' }
                    ]
                },
                {
                    description: 'Grammar and Style',
                    maxPoints: 5,
                    ratings: [
                        { points: 5, description: 'Perfect' },
                        { points: 3, description: 'Good' },
                        { points: 0, description: 'Needs improvement' }
                    ]
                }
            ]
        },
        {
            type: 'new',
            title: 'Technology Impact Assessment Rubric',
            criteria: [
                {
                    description: 'Analysis Depth',
                    longDescription: 'Thoroughness of analysis on technology impact',
                    maxPoints: 15,
                    ratings: [
                        { points: 15, description: 'Excellent', longDescription: 'Deep, comprehensive analysis with multiple perspectives' },
                        { points: 10, description: 'Good', longDescription: 'Solid analysis covering main points' },
                        { points: 5, description: 'Fair', longDescription: 'Basic analysis with limited depth' },
                        { points: 0, description: 'Poor', longDescription: 'Superficial or missing analysis' }
                    ]
                },
                {
                    description: 'Personal Examples',
                    maxPoints: 10,
                    ratings: [
                        { points: 10, description: 'Excellent', longDescription: 'Relevant, detailed personal examples' },
                        { points: 6, description: 'Good', longDescription: 'Some relevant examples provided' },
                        { points: 3, description: 'Fair', longDescription: 'Limited or vague examples' },
                        { points: 0, description: 'Poor', longDescription: 'No examples or irrelevant examples' }
                    ]
                },
                {
                    description: 'Writing Quality',
                    maxPoints: 5,
                    ratings: [
                        { points: 5, description: 'Excellent', longDescription: 'Clear, well-structured writing' },
                        { points: 3, description: 'Good', longDescription: 'Generally clear with minor issues' },
                        { points: 1, description: 'Fair', longDescription: 'Some clarity issues' },
                        { points: 0, description: 'Poor', longDescription: 'Unclear or poorly structured' }
                    ]
                }
            ]
        }
        // Add more new rubric templates as needed
    ];

