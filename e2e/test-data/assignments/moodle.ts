/**
 * Moodle LMS assignment configurations
 * Uses Moodle rubric structure
 */

import { MoodleAssignmentConfig } from '../../types';
import { MOODLE_EXISTING_RUBRICS } from '../rubrics/moodle';
import { getCanvasConfig } from '../../config/canvas.config';

function formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function getAssignmentDates() {
    const now = new Date();
    
    const availableFrom = new Date(now);
    availableFrom.setDate(availableFrom.getDate() - 1);
    availableFrom.setHours(0, 0, 0, 0);

    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 3);
    dueDate.setHours(23, 59, 0, 0);

    const until = new Date(now);
    until.setDate(until.getDate() + 3);
    until.setHours(23, 59, 0, 0);

    return {
        availableFrom: formatDate(availableFrom),
        dueDate: formatDate(dueDate),
        until: formatDate(until)
    };
}

/**
 * Get Moodle assignment configurations
 */
export function getMoodleAssignmentConfigs(): MoodleAssignmentConfig[] {
    const dates = getAssignmentDates();
    // Use Canvas config for defaultPoints and studentNames (shared across LMS)
    const { defaultPoints, studentNames } = getCanvasConfig();

    const elcDescription = `30-Minute Essay Prompt
Identify one improvement that would make your city a better place to live for people your age and explain why people your age would benefit from this change. Use specific reasons and examples to support your opinion and describe the potential immediate and long-term consequences of this improvement. You have 30 minutes to write your response.`;

    const assignAccess = {
        students: studentNames,
        availableFrom: dates.availableFrom,
        dueDate: dates.dueDate,
        until: dates.until
    };
    
    return [
        {
            title: 'Moodle ELC Poor docx',
            description: elcDescription,
            points: defaultPoints,
            submissionType: '.docx',
            submissionFile: 'files/auto_submission_elc_poor.docx',
            assignAccess,
            rubric: MOODLE_EXISTING_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 2,
                    score: 1,
                    feedback:
                        'Your writing has many serious grammar, spelling, and sentence structure mistakes that make it very difficult to follow; to strengthen this area, focus on forming clear, complete sentences with correct spelling and basic grammatical accuracy.',
                },
            ],
        },
        {
            title: 'Moodle ELC Average pdf',
            description: elcDescription,
            points: defaultPoints,
            submissionType: '.pdf',
            submissionFile: 'files/auto_submission_elc_average.pdf',
            assignAccess,
            rubric: MOODLE_EXISTING_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 1,
                    score: 3,
                    feedback:
                        'You provide details about what makes Santiago appealing for young people, but to raise your score, clearly recommend a specific improvement for the city and explain both its immediate and long-term consequences.',
                },
            ],
        },
        {
            title: 'Moodle ELC Above Average txt',
            description: elcDescription,
            points: defaultPoints,
            submissionType: '.txt',
            submissionFile: 'files/auto_submission_elc_above_average.txt',
            assignAccess,
            rubric: MOODLE_EXISTING_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 2,
                    score: 1,
                    feedback:
                        'Your writing has many serious grammar, spelling, and sentence structure mistakes that make it very difficult to follow; to strengthen this area, focus on forming clear, complete sentences with correct spelling and basic grammatical accuracy.',
                },
            ],
        },
        {
            title: 'Moodle ELC Excellent Text Entry',
            description: elcDescription,
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess,
            rubric: MOODLE_EXISTING_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 2,
                    score: 1,
                    feedback:
                        'Your writing has many serious grammar, spelling, and sentence structure mistakes that make it very difficult to follow; to strengthen this area, focus on forming clear, complete sentences with correct spelling and basic grammatical accuracy.',
                },
            ],
        },
        {
            title: 'Moodle CSV submission',
            description: 'Upload a CSV file containing monthly sales data with columns for Product Name, Units Sold, Unit Price, and Total Revenue. The file should contain at least 5 product entries with logically correct calculations and properly formatted rows and headers. Ensure the dataset is complete, readable, and internally consistent so it can be evaluated for accuracy, completeness, and formatting quality.',
            points: defaultPoints,
            submissionType: '.csv',
            submissionFile: 'files/test_submission.csv',
            assignAccess,
            rubric: MOODLE_EXISTING_RUBRICS[1]
        },
        {
            title: 'Moodle XLSX No Rubric submission',
            description: 'Upload an Excel spreadsheet containing employee performance information with columns for Employee Name, Department, Performance Score, and Final Rating. The spreadsheet should include at least 5 employee records with logically correct scores and matching ratings. Organize the workbook clearly and ensure all information is complete, readable, and professionally structured for evaluation.',
            points: defaultPoints,
            submissionType: '.xlsx',
            submissionFile: 'files/test_submission.xlsx',
            assignAccess,
            rubric: { type: 'no' }
        }
    ];
}
