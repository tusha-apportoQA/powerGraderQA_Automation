import { UserCredentials } from './types';
import { getCanvasConfig } from './config/canvas.config';
import { getD2LConfig } from './config/d2l.config';
import { getMoodleConfig } from './config/moodle.config';

function getTestUsers(): UserCredentials[] {
    const users: UserCredentials[] = [];
    
    // Add Canvas users
    try {
        const { credentials } = getCanvasConfig();
        users.push(
            {
                username: credentials.teacherUsername,
                password: credentials.teacherPassword,
                role: 'teacher',
                lms: 'canvas'
            },
            {
                username: credentials.studentUsername,
                password: credentials.studentPassword,
                role: 'student',
                lms: 'canvas'
            }
        );
    } catch (error) {
        console.warn('Canvas config not available:', error);
    }
    
    // Add D2L users
    try {
        const { credentials } = getD2LConfig();
        users.push(
            {
                username: credentials.teacherUsername,
                password: credentials.teacherPassword,
                role: 'teacher',
                lms: 'd2l'
            },
            {
                username: credentials.studentUsername,
                password: credentials.studentPassword,
                role: 'student',
                lms: 'd2l'
            }
        );
    } catch (error) {
        console.warn('D2L config not available:', error);
    }
    
    // Add Moodle users
    try {
        const { credentials } = getMoodleConfig();
        users.push(
            {
                username: credentials.teacherUsername,
                password: credentials.teacherPassword,
                role: 'teacher',
                lms: 'moodle'
            },
            {
                username: credentials.studentUsername,
                password: credentials.studentPassword,
                role: 'student',
                lms: 'moodle'
            }
        );
    } catch (error) {
        console.warn('Moodle config not available:', error);
    }
    
    return users;
}

const testUsers = getTestUsers();

export default testUsers;
