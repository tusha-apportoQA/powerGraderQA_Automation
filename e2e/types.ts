export type UserRoleTypes = 'teacher' | 'student';

export type LMSType = 'canvas' | 'd2l';

export type FormatType = 
  | '.docx' 
  | '.pdf' 
  | '.txt' 
  | 'Text Entry';

export type RubricType = 'existing' | 'new' | 'no';

// Canvas-specific rubric types
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

// D2L-specific rubric types
export type D2LExistingRubricConfig = {
  type: 'existing';
  groupName: string;
  rubricName: string;
};

export type D2LNoRubricConfig = { type: 'no' };

// D2L rubric level - applies to all criteria
export type D2LRubricLevel = {
    name: string;
    points: number;
};

// D2L overall level - for overall rubric scoring
export type D2LOverallLevel = {
    levelName: string;
    score: number;
};

// D2L criterion level item - one per level, each with its own description and initialFeedback
export type D2LRubricCriterionLevelItem = {
    description: string;
    initialFeedback: string;
};

// D2L criterion - has a name and an array of level items (one per level)
export type D2LRubricCriterion = {
    name: string;  // Criterion name
    levelItems: D2LRubricCriterionLevelItem[];  // Array length must equal levels.length, one item per level
};

export type D2LNewRubricConfig = {
  type: 'new';
  title: string;
  levels: D2LRubricLevel[];  // Fixed levels that apply to all criteria [{name, points}]
  criterion: D2LRubricCriterion[];  // Criteria with description and initialFeedback array
  overallLevels: D2LOverallLevel[];  // Overall levels for rubric scoring [{levelName, score}]
};

// Union types for rubric configs
export type CanvasRubricConfig = ExistingRubricConfig | NoRubricConfig | NewRubricConfig;
export type D2LRubricConfig = D2LExistingRubricConfig | D2LNoRubricConfig | D2LNewRubricConfig;

// Legacy type for backward compatibility
export type AssignmentRubricConfig = CanvasRubricConfig | D2LRubricConfig;

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

// Canvas-specific assignment config
export interface CanvasAssignmentConfig {
  title: string;
  description?: string;
  points?: number;
  assignmentGroup?: string;
  submissionType?: FormatType;
  courseName?: string;
  assignAccess?: CanvasAssignmentData;
  rubric?: CanvasRubricConfig;
}

// D2L-specific assignment config
export interface D2LAssignmentConfig {
  title: string;
  description?: string;
  points?: number;
  submissionType?: FormatType;
  courseName?: string;
  assignAccess?: CanvasAssignmentData;  // Reuse CanvasAssignmentData for date/student assignment
  rubric?: D2LRubricConfig;
}

// Legacy type for backward compatibility
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

// PowerGrader grading report types
export interface CriterionScore {
    name: string;              // e.g., "Content Quality"
    points: number;            // AI-seeded score (e.g., 7)
    feedback: string;          // AI-generated feedback text
}

export interface GradingSummary {
    totalScore: string;         // e.g., "12/15"
    criteria: CriterionScore[]; // Array of all criteria with scores and feedback
}
