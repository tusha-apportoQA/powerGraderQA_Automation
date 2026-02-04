import { UserCredentials } from './types';
import { getCanvasConfig } from './config/canvas.config';

function getTestUsers(): UserCredentials[] {
    const { credentials } = getCanvasConfig();
    
    return [
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
    ];
}

const testUsers = getTestUsers();

export default testUsers;
