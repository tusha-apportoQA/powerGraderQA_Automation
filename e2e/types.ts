export type UserRoleTypes = 'teacher' | 'student';

export type LMSType = 'canvas';

export type FormatType = 
  | '.docx' 
  | '.pdf' 
  | '.txt' 
  | 'Text Entry';

export type RubricType = 'existing' | 'new' | 'no';

export type ExistingRubricConfig = {
  type: 'existing';
  groupName: string;
  rubricName: string;
};

export type NoRubricConfig = { type: 'no' };

export type RubricRating = {
    points: number;
    description: string;
    longDescription?: string;
};

export type RubricCriterion = {
    description: string;
    longDescription?: string;
    maxPoints: number;
    useRange?: boolean;
    ratings: RubricRating[];
};

export type NewRubricConfig = {
  type: 'new';
    title: string;
    criteria: RubricCriterion[];
};

export type AssignmentRubricConfig = ExistingRubricConfig | NoRubricConfig | NewRubricConfig;

export interface UserCredentials {
  username: string;
  password: string;
  firstname?: string;
  lastname?: string;
  role: UserRoleTypes;
  lms?: LMSType;
}

export interface CanvasAssignmentData {
  assignTo?: 'Everyone' | 'Everyone else';
  students?: string[];
  sections?: string[];
  exclude?: string[];
    dueDate?: string;
    availableFrom?: string;
    until?: string;
}

export interface AssignmentConfig {
  title: string;
  description?: string;
  points?: number;
  assignmentGroup?: string;
  submissionType?: FormatType;
  courseName?: string;
  assignAccess?: CanvasAssignmentData;
  rubric?: AssignmentRubricConfig;
}

export interface StoredAssignment {
    title: string;
    assignmentId: string;
    courseName?: string;
    submissionType?: FormatType;
    createdAt?: string;
}

export interface AssignmentStorage {
    assignments: StoredAssignment[];
}
