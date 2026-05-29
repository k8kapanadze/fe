/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RawQuestion {
  id: string;
  text: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  sourceFile: string;
  originalIndex: number; // 1-based index in the original file
}

export interface PlayableQuestion {
  id: string;
  text: string;
  correctAnswer: string;
  options: string[]; // Shuffled incorrect + correct options
  originalIndex: number;
  sourceFile: string;
  flagged?: boolean;
}

export interface MistakeCollection {
  id: string;
  name: string;
  timestamp: string;
  sourceFile: string;
  questions: RawQuestion[];
  completedCount: number;
  successRate: number;
}

export interface ActiveSession {
  type: 'main' | 'mistakes_interim' | 'mistakes_only' | 'flagged_only' | 'simulation';
  sourceFiles: string[];
  originalQuestions: RawQuestion[]; // Unfiltered, unshuffled questions for this session
  questions: PlayableQuestion[];    // Filtered/shuffled questions to be answered
  currentIndex: number;
  answers: { [questionId: string]: { selected: string; isCorrect: boolean } };
  pausedIndex?: number;             // Saved main session index when jumping into real-time mistake practice
}

export interface FileData {
  name: string;
  questions: RawQuestion[];
  sizeStr: string;
}

export interface SimulationConfig {
  fileAllocations: { [fileName: string]: number };
  totalQuestions: number;
}
