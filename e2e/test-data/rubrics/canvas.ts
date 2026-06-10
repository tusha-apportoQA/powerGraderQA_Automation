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
            rubricName: 'Code evaluation easy'
        },
        {
            type: 'existing',
            groupName: 'CS 202 (Course)',
            rubricName: 'Code evaluation medium'
        },
        {
            type: 'existing',
            groupName: 'CS 202 (Course)',
            rubricName: 'Code evaluation hard'
        },
        {
            type: 'existing',
            groupName: 'CS 202 (Course)',
            rubricName: 'ELC Essay Rubric'
        },
        {
            type: 'existing',
            groupName: 'CS 202 (Course)',
            rubricName: 'Sales Data Rubric'
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
        },
        {
            type: 'new',
            title: 'Sales Data Rubric',
            criteria: [
                {
                    description: 'Data Completeness',
                    longDescription: 'Dataset contains all required rows, columns, and values',
                    maxPoints: 10,
                    ratings: [
                        { points: 10, description: 'Excellent', longDescription: 'All required data is complete and accurate' },
                        { points: 7, description: 'Good', longDescription: 'Minor missing values or formatting issues' },
                        { points: 4, description: 'Fair', longDescription: 'Several missing values or incomplete rows' },
                        { points: 0, description: 'Poor', longDescription: 'Large portions of data missing or unusable' }
                    ]
                },
                {
                    description: 'Data Accuracy',
                    longDescription: 'Sales calculations and totals are logically correct',
                    maxPoints: 15,
                    ratings: [
                        { points: 15, description: 'Excellent', longDescription: 'All calculations and totals are correct' },
                        { points: 10, description: 'Good', longDescription: 'Minor calculation mistakes present' },
                        { points: 5, description: 'Fair', longDescription: 'Multiple calculation inconsistencies' },
                        { points: 0, description: 'Poor', longDescription: 'Data contains major logical or mathematical errors' }
                    ]
                },
                {
                    description: 'Organization and Formatting',
                    longDescription: 'CSV is structured clearly with proper headers and formatting',
                    maxPoints: 5,
                    ratings: [
                        { points: 5, description: 'Excellent', longDescription: 'Well-structured and easy to read' },
                        { points: 3, description: 'Good', longDescription: 'Mostly organized with minor issues' },
                        { points: 1, description: 'Fair', longDescription: 'Formatting inconsistencies reduce readability' },
                        { points: 0, description: 'Poor', longDescription: 'Poorly formatted or difficult to interpret' }
                    ]
                }
            ]
        },
        {
            type: 'new',
            title: 'Employee Performance Rubric',
            criteria: [
                {
                    description: 'Spreadsheet Completeness',
                    longDescription: 'Spreadsheet includes all required employee performance data',
                    maxPoints: 10,
                    ratings: [
                        { points: 10, description: 'Excellent', longDescription: 'All employee records are complete' },
                        { points: 7, description: 'Good', longDescription: 'Minor missing entries exist' },
                        { points: 4, description: 'Fair', longDescription: 'Several incomplete records present' },
                        { points: 0, description: 'Poor', longDescription: 'Spreadsheet lacks required data' }
                    ]
                },
                {
                    description: 'Performance Evaluation Accuracy',
                    longDescription: 'Scores, averages, and ratings are logically correct',
                    maxPoints: 15,
                    ratings: [
                        { points: 15, description: 'Excellent', longDescription: 'All evaluations and calculations are accurate' },
                        { points: 10, description: 'Good', longDescription: 'Minor scoring inconsistencies found' },
                        { points: 5, description: 'Fair', longDescription: 'Multiple scoring errors detected' },
                        { points: 0, description: 'Poor', longDescription: 'Performance data is inaccurate or inconsistent' }
                    ]
                },
                {
                    description: 'Professional Structure',
                    longDescription: 'Workbook is neatly organized and easy to understand',
                    maxPoints: 5,
                    ratings: [
                        { points: 5, description: 'Excellent', longDescription: 'Highly organized and professional layout' },
                        { points: 3, description: 'Good', longDescription: 'Generally organized with small issues' },
                        { points: 1, description: 'Fair', longDescription: 'Some structural confusion present' },
                        { points: 0, description: 'Poor', longDescription: 'Difficult to read or poorly arranged' }
                    ]
                }
            ]
        }
        // Add more new rubric templates as needed
    ];

