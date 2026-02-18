/**
 * D2L Configuration
 * 
 * Centralized configuration for D2L LMS automation.
 * All D2L-related settings should be managed from here.
 * 
 * To update these values, modify the .env file in the project root.
 */

import * as dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config();

export interface D2LCredentials {
    teacherUsername: string;
    teacherPassword: string;
    studentUsername: string;
    studentPassword: string;
}

export default defineConfig({
  reporter: [
    ['line'],                             // Gives you clean terminal output
    ['allure-playwright', {               // The Allure magic
      detail: true,
      outputFolder: 'allure-results',    // Where the raw data goes
      suiteTitle: false,
    }],
  ],
});

export interface D2LConfig {
    baseURL: string;
    courseName: string;
    credentials: D2LCredentials;
}

export function getD2LConfig(): D2LConfig {
    const baseURL = process.env.D2L_BASE_URL;
    const courseName = process.env.D2L_COURSE_NAME;
    const teacherUsername = process.env.D2L_TEACHER_USERNAME;
    const teacherPassword = process.env.D2L_TEACHER_PASSWORD;
    const studentUsername = process.env.D2L_STUDENT_USERNAME;
    const studentPassword = process.env.D2L_STUDENT_PASSWORD;

    if (!baseURL) {
        throw new Error('D2L_BASE_URL environment variable is required. Please set it in your .env file.');
    }
    if (!teacherUsername) {
        throw new Error('D2L_TEACHER_USERNAME environment variable is required. Please set it in your .env file.');
    }
    if (!teacherPassword) {
        throw new Error('D2L_TEACHER_PASSWORD environment variable is required. Please set it in your .env file.');
    }
    if (!studentUsername) {
        throw new Error('D2L_STUDENT_USERNAME environment variable is required. Please set it in your .env file.');
    }
    if (!studentPassword) {
        throw new Error('D2L_STUDENT_PASSWORD environment variable is required. Please set it in your .env file.');
    }

    return {
        baseURL,
        courseName: courseName || '',
        credentials: {
            teacherUsername,
            teacherPassword,
            studentUsername,
            studentPassword
        }
    };
}

