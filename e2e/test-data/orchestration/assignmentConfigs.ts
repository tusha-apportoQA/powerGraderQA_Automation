import { AssignmentConfig } from '../../types';
import { getExistingRubric, getNewRubric } from '../constants';
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
    
    // Available from: Current date at 12:00 AM (midnight)
    const availableFrom = new Date(now);
    availableFrom.setHours(0, 0, 0, 0);

    // Due date: 3 days after current date
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 3);
    dueDate.setHours(23, 59, 0, 0);

    // Available until: 3 days after current date
    const until = new Date(now);
    until.setDate(until.getDate() + 3);
    until.setHours(23, 59, 0, 0);

    return {
        availableFrom: formatDate(availableFrom),
        dueDate: formatDate(dueDate),
        until: formatDate(until)
    };
}

export function getOrchestrationAssignmentConfigs(): AssignmentConfig[] {
    const dates = getAssignmentDates();
    const { defaultPoints, studentNames } = getCanvasConfig();
    
    return [
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
            rubric: { type: 'no' }
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
            rubric: getExistingRubric(0)
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
            rubric: getNewRubric(0)
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
            rubric: getExistingRubric(0)
        }
    ];
}

