/**
 * D2L LMS assignment configurations
 * Uses D2L rubric structure (fixed levels applied to all criteria)
 */

import { D2LAssignmentConfig } from '../../types';
import { D2L_EXISTING_RUBRICS, D2L_NEW_RUBRICS } from '../rubrics/d2l';
import { getD2LConfig } from '../../config/d2l.config';
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
 * Get D2L assignment configurations
 */
export function getD2LAssignmentConfigs(): D2LAssignmentConfig[] {
    const dates = getAssignmentDates();
    // Use Canvas config for defaultPoints and studentNames (shared across LMS)
    const { defaultPoints, studentNames } = getCanvasConfig();
    
    return [
        {
            title: 'D2L DOCX No Rubric',
            description: 'Write a brief essay about technology impact. Focus on accuracy and precision.',
            points: defaultPoints,
            submissionType: '.docx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: { type: 'no' }
        },
        {
            title: 'D2L DOCX Existing Rubric',
            description: 'Write a brief essay about technology impact. Focus on accuracy and precision.',
            points: defaultPoints,
            submissionType: '.docx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_EXISTING_RUBRICS[0]
        },
        {
            title: 'D2L DOCX New Rubric',
            description: 'Write a brief essay about technology impact. Focus on accuracy and precision.',
            points: defaultPoints,
            submissionType: '.docx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_NEW_RUBRICS[0]
        },
        {
            title: 'D2L PDF No Rubric',
            description: 'Write a comprehensive essay about the impact of technology in daily life.',
            points: defaultPoints,
            submissionType: '.pdf',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: { type: 'no' }
        },
        {
            title: 'D2L PDF Existing Rubric',
            description: 'Write a comprehensive essay about the impact of technology in daily life.',
            points: defaultPoints,
            submissionType: '.pdf',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_EXISTING_RUBRICS[1]
        },
        {
            title: 'D2L PDF New Rubric',
            description: 'Write a comprehensive essay about the impact of technology in daily life.',
            points: defaultPoints,
            submissionType: '.pdf',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_NEW_RUBRICS[1]
        },
        {
            title: 'D2L TXT No Rubric',
            description: 'Write about tech. Keep it short.',
            points: defaultPoints,
            submissionType: '.txt',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: { type: 'no' }
        },
        {
            title: 'D2L TXT Existing Rubric',
            description: 'Write about tech. Keep it short.',
            points: defaultPoints,
            submissionType: '.txt',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_EXISTING_RUBRICS[2]
        },
        {
            title: 'D2L TXT New Rubric',
            description: 'Write about tech. Keep it short.',
            points: defaultPoints,
            submissionType: '.txt',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_NEW_RUBRICS[2]
        },
        {
            title: 'D2L Text Entry No Rubric',
            description: 'Tech essay. Brief.',
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: { type: 'no' }
        },
        {
            title: 'D2L Text Entry Existing Rubric',
            description: 'Tech essay. Brief.',
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_EXISTING_RUBRICS[3]
        },
        {
            title: 'D2L Text Entry New Rubric',
            description: 'Tech essay. Brief.',
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_NEW_RUBRICS[3]
        },
        {
            title: 'New Rubric CSV',
            description: 'Upload a CSV file containing monthly sales data with columns for Product Name, Units Sold, Unit Price, and Total Revenue. The file should contain at least 5 product entries with logically correct calculations and properly formatted rows and headers. Ensure the dataset is complete, readable, and internally consistent so it can be evaluated for accuracy, completeness, and formatting quality.',
            points: defaultPoints,
            submissionType: '.csv',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_NEW_RUBRICS[4]
        },
        {
            title: 'New RubricXLSX',
            description: 'Upload an Excel spreadsheet containing employee performance information with columns for Employee Name, Department, Performance Score, and Final Rating. The spreadsheet should include at least 5 employee records with logically correct scores and matching ratings. Organize the workbook clearly and ensure all information is complete, readable, and professionally structured for evaluation.',
            points: defaultPoints,
            submissionType: '.xlsx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: D2L_NEW_RUBRICS[5]
        }
    ];
}

