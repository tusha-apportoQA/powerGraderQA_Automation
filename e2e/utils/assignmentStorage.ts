import * as fs from 'fs';
import * as path from 'path';
import { StoredAssignment, AssignmentStorage } from '../types';

const STORAGE_FILE = path.resolve(__dirname, '../test-data/created-assignments.json');

function ensureStorageFile(): void {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STORAGE_FILE)) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify({ assignments: [] }, null, 2));
    }
}

function readStorage(): AssignmentStorage {
    ensureStorageFile();
    try {
        const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { assignments: [] };
    }
}

function writeStorage(storage: AssignmentStorage): void {
    ensureStorageFile();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
}

export function saveAssignment(assignment: StoredAssignment): void {
    const storage = readStorage();
    const existingIndex = storage.assignments.findIndex(a => a.title === assignment.title);
    
    if (existingIndex >= 0) {
        storage.assignments[existingIndex] = {
            ...storage.assignments[existingIndex],
            ...assignment,
            createdAt: storage.assignments[existingIndex].createdAt || new Date().toISOString()
        };
    } else {
        storage.assignments.push({
            ...assignment,
            createdAt: new Date().toISOString()
        });
    }
    
    writeStorage(storage);
}

export function loadAssignments(): StoredAssignment[] {
    const storage = readStorage();
    return storage.assignments;
}

export function clearAssignments(): void {
    writeStorage({ assignments: [] });
}

