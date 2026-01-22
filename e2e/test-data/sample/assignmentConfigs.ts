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

export function getSampleAssignmentConfigs(): AssignmentConfig[] {
    const dates = getAssignmentDates();
    const { defaultPoints, studentNames } = getCanvasConfig();
    
    return [
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
            rubric: getExistingRubric(0)
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
            rubric: getNewRubric(0)
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
            rubric: getExistingRubric(0)
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
            rubric: getNewRubric(0)
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
            rubric: getExistingRubric(0)
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
            rubric: getNewRubric(0)
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
            rubric: getExistingRubric(0)
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
            rubric: getNewRubric(0)
        }
    ];
}
