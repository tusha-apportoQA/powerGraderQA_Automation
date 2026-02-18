/**
 * Canvas Configuration
 * 
 * Centralized configuration for Canvas LMS automation.
 * All Canvas-related settings should be managed from here.
 * 
 * To update these values, modify the .env file in the project root.
 */

import * as dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config();

export interface CanvasCredentials {
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

export interface CanvasConfig {
    baseURL: string;
    courseName: string;
    assignmentGroup: string;
    studentNames: string[];
    defaultPoints: number;
    credentials: CanvasCredentials;
}

export function getCanvasConfig(): CanvasConfig {
    const baseURL = process.env.CANVAS_BASE_URL;
    const courseName = process.env.CANVAS_COURSE_NAME;
    const assignmentGroup = process.env.CANVAS_ASSIGNMENT_GROUP;
    const studentName = process.env.CANVAS_STUDENT_NAME;
    const defaultPoints = process.env.CANVAS_DEFAULT_POINTS;
    const teacherUsername = process.env.CANVAS_TEACHER_USERNAME;
    const teacherPassword = process.env.CANVAS_TEACHER_PASSWORD;
    const studentUsername = process.env.CANVAS_STUDENT_USERNAME;
    const studentPassword = process.env.CANVAS_STUDENT_PASSWORD;

    if (!baseURL) {
        throw new Error('CANVAS_BASE_URL environment variable is required. Please set it in your .env file.');
    }
    if (!courseName) {
        throw new Error('CANVAS_COURSE_NAME environment variable is required. Please set it in your .env file.');
    }
   if (!assignmentGroup) {
        throw new Error('CANVAS_ASSIGNMENT_GROUP environment variable is required. Please set it in your .env file.');
    }
    if (!studentName) {
        throw new Error('CANVAS_STUDENT_NAME environment variable is required. Please set it in your .env file.');
    }
    if (!defaultPoints) {
        throw new Error('CANVAS_DEFAULT_POINTS environment variable is required. Please set it in your .env file.');
    }
    if (!teacherUsername) {
        throw new Error('CANVAS_TEACHER_USERNAME environment variable is required. Please set it in your .env file.');
    }
    if (!teacherPassword) {
        throw new Error('CANVAS_TEACHER_PASSWORD environment variable is required. Please set it in your .env file.');
    }
    if (!studentUsername) {
        throw new Error('CANVAS_STUDENT_USERNAME environment variable is required. Please set it in your .env file.');
    }
    if (!studentPassword) {
        throw new Error('CANVAS_STUDENT_PASSWORD environment variable is required. Please set it in your .env file.');
    }

    return {
        baseURL,
        courseName,
        assignmentGroup,
        studentNames: [studentName.trim()],
        defaultPoints: parseInt(defaultPoints, 10),
        credentials: {
            teacherUsername,
            teacherPassword,
            studentUsername,
            studentPassword
        }
    };
}

