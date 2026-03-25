/**
 * Canvas LMS assignment configurations
 * Combined configs for both orchestration and component tests
 */

import { CanvasAssignmentConfig } from '../../types';
import { CANVAS_EXISTING_RUBRICS, CANVAS_NEW_RUBRICS } from '../rubrics/canvas';
import { getCanvasConfig } from '../../config/canvas.config';

/*function formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    // Canvas expects DD/MM/YYYY format (interprets MM/DD/YYYY as DD/MM/YYYY)
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}*/

function formatDate(date: Date): string {
    // This automatically detects the user's locale (US vs UK) 
    // and formats the date and time to match their specific UI settings.
    return date.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // Using 12-hour format with AM/PM is the most 'compatible' for Canvas
    }).replace(',', ''); // Removes the comma often placed between date and time
}

function getAssignmentDates() {
    const now = new Date();
    
    // Available from: Current date at 12:00 AM (midnight)
    const availableFrom = new Date(now);
    availableFrom.setHours(0, 0, 0, 0);

    // Due date: 3 days after current date
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 3);
    dueDate.setHours(8, 0, 0, 0);

    // Available until: 3 days after current date
    const until = new Date(now);
    until.setDate(until.getDate() + 3);
    until.setHours(10, 0, 0, 0);

    return {
        availableFrom: formatDate(availableFrom),
        dueDate: formatDate(dueDate),
        until: formatDate(until)
    };
}

/**
 * Get Canvas assignment configurations
 * Combined array used for both orchestration and component tests
 */
export function getCanvasAssignmentConfigs(): CanvasAssignmentConfig[] {
    const dates = getAssignmentDates();
    const { defaultPoints, studentNames } = getCanvasConfig();
    
    return [
        // Orchestration test configs
        {
            title: 'Short Accurate No Rubric DOCX',
            description: 'Write a brief essay about technology impact. Focus on accuracy and precision.',
            points: defaultPoints,
            submissionType: '.docx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: { type: 'no' },
            teacherEdits: [
                {
                    criterionIndex: 0,
                    score: 35,
                    feedback: "Your submission accurately identifies technology's core impacts in daily life, but including more specific details or examples would deepen your demonstration of understanding."
                },
                {
                    criterionIndex: 1,
                    score: 30,
                    feedback: "Your writing is generally clear and precise with strong, readable sentences, but repeating your title within the essay slightly reduced the overall polish. To reach an even higher score, aim to eliminate minor redundancies."
                },
                {
                    criterionIndex: 3,
                    score: 5,
                    feedback: "Your submission accurately describes technology's importance but stays at a general, surface level without offering original insight or analysis. To earn higher scores in this category, try including your personal perspective, deeper analysis, or specific examples."
                }
            ]
        },
        {
            title: 'Long Accurate Existing Rubric PDF',
            description: 'Write a comprehensive essay about the impact of technology in daily life. Discuss both positive and negative aspects in detail, provide multiple examples from personal experience, analyze long-term implications, and consider various perspectives including social, economic, and environmental factors. Ensure all information is accurate and well-researched.',
            points: defaultPoints,
            submissionType: '.pdf',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 0,
                    score: 0,
                    feedback: "Your submission did not address the required topic of technology's impact in daily life. Be sure to read the assignment instructions carefully and focus your analysis on the assigned topic to earn full credit."
                }
            ]
        },
        {
            title: 'Short Inaccurate New Rubric TXT',
            description: 'Write about tech. Keep it short.',
            points: defaultPoints,
            submissionType: '.txt',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_NEW_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 0,
                    score: 7,
                    feedback: "Your submission clearly identifies technology's role in daily life and provides relevant examples, showing a good understanding, but covering mainly the benefits without deeper analysis. To reach a higher score, consider discussing challenges or long-term effects as well."
                },
                {
                    criterionIndex: 1,
                    score: 6,
                    feedback: "Your writing is clear, grammatically correct, and easy to read, with appropriate style and sentence structure for a concise academic response. Your strong command of language mechanics meets the expectations for this assignment."
                }
            ]
        },
        {
            title: 'Short Inaccurate Existing Rubric Text Entry',
            description: 'Tech essay. Brief.',
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[0],
            teacherEdits: [
                {
                    criterionIndex: 0,
                    score: 5,
                    feedback: "Your essay is brief, clearly focused on technology, introduces the topic well, provides organized points, and finishes with a thoughtful conclusion, and meets all the assignment requirements."
                }
            ]
        },
        // Component test configs
        {
            title: 'Sample DOCX No Rubric',
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
            title: 'Sample DOCX Existing Rubric',
            description: 'Write a brief essay about technology impact. Focus on accuracy and precision.',
            points: defaultPoints,
            submissionType: '.docx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[1]
        },
        {
            title: 'Sample DOCX New Rubric',
            description: 'Write a brief essay about technology impact. Focus on accuracy and precision.',
            points: defaultPoints,
            submissionType: '.docx',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_NEW_RUBRICS[0]
        },
        {
            title: 'Sample PDF No Rubric',
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
            title: 'Sample PDF Existing Rubric',
            description: 'Write a comprehensive essay about the impact of technology in daily life.',
            points: defaultPoints,
            submissionType: '.pdf',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[0]
        },
        {
            title: 'Sample PDF New Rubric',
            description: 'Write a comprehensive essay about the impact of technology in daily life.',
            points: defaultPoints,
            submissionType: '.pdf',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_NEW_RUBRICS[1]
        },
        {
            title: 'Sample TXT No Rubric',
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
            title: 'Sample TXT Existing Rubric',
            description: 'Write about tech. Keep it short.',
            points: defaultPoints,
            submissionType: '.txt',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[0]
        },
        {
            title: 'Sample TXT New Rubric',
            description: 'Write about tech. Keep it short.',
            points: defaultPoints,
            submissionType: '.txt',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_NEW_RUBRICS[0]
        },
        {
            title: 'Sample Text Entry No Rubric',
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
            title: 'Sample Text Entry Existing Rubric',
            description: 'Tech essay. Brief.',
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[0]
        },
        {
            title: 'Sample Text Entry New Rubric',
            description: 'Tech essay. Brief.',
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                students: studentNames,
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_NEW_RUBRICS[0]
        }
    ];
}

