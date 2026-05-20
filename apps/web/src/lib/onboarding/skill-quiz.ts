/**
 * Skill quiz scoring. 8 questions, each answer 0 / 0.5 / 1.0 points.
 * Sum maps to a starting display rating used for first-time players whose
 * `user_ratings.match_count === 0`. Once a player has real matches the
 * quiz answers are recorded but the rating is not overwritten.
 */

export type QuestionId =
  | 'tennisYears'
  | 'padelMonths'
  | 'backWall'
  | 'attendance'
  | 'serve'
  | 'lob'
  | 'bandejaVibora'
  | 'tournaments';

export const QUIZ_QUESTION_IDS: readonly QuestionId[] = [
  'tennisYears',
  'padelMonths',
  'backWall',
  'attendance',
  'serve',
  'lob',
  'bandejaVibora',
  'tournaments',
] as const;

export type AnswerKey = 'a' | 'b' | 'c';

export const ANSWER_POINTS: Record<AnswerKey, number> = {
  a: 0,
  b: 0.5,
  c: 1.0,
};

export type QuizAnswers = Partial<Record<QuestionId, AnswerKey>>;

/** Sum points across all answered questions. Unanswered counts as 0. */
export function scoreQuiz(answers: QuizAnswers): number {
  let total = 0;
  for (const id of QUIZ_QUESTION_IDS) {
    const key = answers[id];
    if (key) total += ANSWER_POINTS[key];
  }
  return total;
}

/**
 * Convert quiz score (0-8) to a starting display rating.
 * Bands per spec:
 *   0-1   -> 1.5
 *   2-3   -> 2.5
 *   4-5   -> 3.5
 *   6-7   -> 4.5
 *   8     -> 5.5
 */
export function scoreToStartingRating(score: number): number {
  if (score <= 1) return 1.5;
  if (score <= 3) return 2.5;
  if (score <= 5) return 3.5;
  if (score < 8) return 4.5;
  return 5.5;
}

export function quizStartingRating(answers: QuizAnswers): number {
  return scoreToStartingRating(scoreQuiz(answers));
}

/** Validate that an answers payload only contains known keys + answer values. */
export function isValidQuizAnswers(input: unknown): input is QuizAnswers {
  if (!input || typeof input !== 'object') return false;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!(QUIZ_QUESTION_IDS as readonly string[]).includes(k)) return false;
    if (v !== 'a' && v !== 'b' && v !== 'c') return false;
  }
  return true;
}
