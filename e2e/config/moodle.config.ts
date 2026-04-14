/**
 * Moodle Configuration
 * 
 * Centralized configuration for Moodle LMS automation.
 * All Moodle-related settings should be managed from here.
 * 
 * To update these values, modify the .env file in the project root.
 */

import * as dotenv from 'dotenv';

dotenv.config();

export interface MoodleCredentials {
    teacherUsername: string;
    teacherPassword: string;
    studentUsername: string;
    studentPassword: string;
}

export interface MoodleConfig {
    baseURL: string;
    courseName: string;
    /** PowerGrader QA instance link text (e.g. "amit powergrader QA") – used to open PowerGrader from course page. */
    powergraderQaInstanceName: string;
    /** Display name as shown in Moodle UI (e.g. "First Last"). Used by LMS verify flow. */
    studentDisplayName: string;
    credentials: MoodleCredentials;
}

export function getMoodleConfig(): MoodleConfig {
    const baseURL = process.env.MOODLE_BASE_URL;
    const courseName = process.env.MOODLE_COURSE_NAME;
    const powergraderQaInstanceName = process.env.MOODLE_POWERGRADER_QA_INSTANCE_NAME;
    const teacherUsername = process.env.MOODLE_TEACHER_USERNAME;
    const teacherPassword = process.env.MOODLE_TEACHER_PASSWORD;
    const studentUsername = process.env.MOODLE_STUDENT_USERNAME;
    const studentPassword = process.env.MOODLE_STUDENT_PASSWORD;
    const studentDisplayName = process.env.MOODLE_STUDENT_DISPLAY_NAME || studentUsername;

    if (!baseURL) {
        throw new Error('MOODLE_BASE_URL environment variable is required. Please set it in your .env file.');
    }
    if (!teacherUsername) {
        throw new Error('MOODLE_TEACHER_USERNAME environment variable is required. Please set it in your .env file.');
    }
    if (!teacherPassword) {
        throw new Error('MOODLE_TEACHER_PASSWORD environment variable is required. Please set it in your .env file.');
    }
    if (!studentUsername) {
        throw new Error('MOODLE_STUDENT_USERNAME environment variable is required. Please set it in your .env file.');
    }
    if (!studentPassword) {
        throw new Error('MOODLE_STUDENT_PASSWORD environment variable is required. Please set it in your .env file.');
    }
    if (!powergraderQaInstanceName) {
        throw new Error('MOODLE_POWERGRADER_QA_INSTANCE_NAME environment variable is required (e.g. "amit powergrader QA"). Please set it in your .env file.');
    }

    return {
        baseURL,
        courseName: courseName || '',
        powergraderQaInstanceName,
        studentDisplayName: (studentDisplayName || studentUsername || '').trim(),
        credentials: {
            teacherUsername,
            teacherPassword,
            studentUsername,
            studentPassword,
        }
    };
}

