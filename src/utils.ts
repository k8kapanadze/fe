/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawQuestion, PlayableQuestion } from './types';

/**
 * Parses medical question text file into RawQuestion array.
 * Syntax:
 * //// — Question start
 * /// — Incorrect option
 * // — Correct option
 */
export function parseQuestionFile(text: string, fileName: string): RawQuestion[] {
  const lines = text.split(/\r?\n/);
  const questions: RawQuestion[] = [];
  let currentQuestion: Partial<RawQuestion> | null = null;
  let originalIdx = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('////')) {
      // Save previous question if valid
      if (currentQuestion && currentQuestion.text && (currentQuestion.correctAnswer || currentQuestion.incorrectAnswers?.length)) {
        questions.push({
          id: `${fileName}-${originalIdx}-${Math.random().toString(36).substring(2, 9)}`,
          text: currentQuestion.text,
          correctAnswer: currentQuestion.correctAnswer || '',
          incorrectAnswers: currentQuestion.incorrectAnswers || [],
          sourceFile: fileName,
          originalIndex: originalIdx++,
        } as RawQuestion);
      }
      
      currentQuestion = {
        text: line.substring(4).trim(),
        incorrectAnswers: [],
      };
    } else if (line.startsWith('///')) {
      if (!currentQuestion) {
        currentQuestion = { text: 'უტექსტო კითხვა', incorrectAnswers: [] };
      }
      currentQuestion.incorrectAnswers?.push(line.substring(3).trim());
    } else if (line.startsWith('//') && !line.startsWith('///') && !line.startsWith('////')) {
      if (!currentQuestion) {
        currentQuestion = { text: 'უტექსტო კითხვა', incorrectAnswers: [] };
      }
      currentQuestion.correctAnswer = line.substring(2).trim();
    } else {
      // Append text block to question text
      if (currentQuestion) {
        if (!currentQuestion.correctAnswer && (!currentQuestion.incorrectAnswers || currentQuestion.incorrectAnswers.length === 0)) {
          currentQuestion.text = (currentQuestion.text ? currentQuestion.text + '\n' : '') + line;
        }
      }
    }
  }

  // Save the last question
  if (currentQuestion && currentQuestion.text && (currentQuestion.correctAnswer || currentQuestion.incorrectAnswers?.length)) {
    questions.push({
      id: `${fileName}-${originalIdx}-${Math.random().toString(36).substring(2, 9)}`,
      text: currentQuestion.text,
      correctAnswer: currentQuestion.correctAnswer || '',
      incorrectAnswers: currentQuestion.incorrectAnswers || [],
      sourceFile: fileName,
      originalIndex: originalIdx,
    } as RawQuestion);
  }

  return questions;
}

/**
 * Standard Fisher-Yates array shuffling algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds playable questions by scrambling the option order and optionally shuffling the questions too.
 */
export function prepareSessionQuestions(
  rawQuestions: RawQuestion[],
  shuffleQuestions: boolean,
  shuffleOptions: boolean
): PlayableQuestion[] {
  let list = [...rawQuestions];
  if (shuffleQuestions) {
    list = shuffleArray(list);
  }

  return list.map((q) => {
    let options = [q.correctAnswer, ...q.incorrectAnswers].filter(Boolean);
    if (shuffleOptions) {
      options = shuffleArray(options);
    }
    return {
      id: q.id,
      text: q.text,
      correctAnswer: q.correctAnswer,
      options,
      originalIndex: q.originalIndex,
      sourceFile: q.sourceFile,
    };
  });
}

/**
 * Serializes raw questions to the platform-compatible text format.
 */
export function serializeToCustomFormat(questions: RawQuestion[]): string {
  return questions
    .map((q) => {
      const qText = `//// ${q.text}`;
      const correct = `// ${q.correctAnswer}`;
      const incorrects = q.incorrectAnswers.map((opt) => `/// ${opt}`).join('\n');
      return `${qText}\n${correct}\n${incorrects}`;
    })
    .join('\n\n');
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
