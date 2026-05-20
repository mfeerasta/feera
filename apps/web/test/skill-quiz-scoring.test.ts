import { describe, expect, it } from 'vitest';
import {
  ANSWER_POINTS,
  QUIZ_QUESTION_IDS,
  isValidQuizAnswers,
  quizStartingRating,
  scoreQuiz,
  scoreToStartingRating,
} from '@/lib/onboarding/skill-quiz';

describe('skill-quiz scoring', () => {
  it('scores empty answers as zero', () => {
    expect(scoreQuiz({})).toBe(0);
  });

  it('sums points per answer key', () => {
    expect(
      scoreQuiz({
        tennisYears: 'c',
        padelMonths: 'c',
        backWall: 'b',
        attendance: 'b',
        serve: 'a',
        lob: 'b',
        bandejaVibora: 'a',
        tournaments: 'c',
      }),
    ).toBeCloseTo(0 + 1 + 1 + 0.5 + 0.5 + 0 + 0.5 + 1, 5);
  });

  it('caps at 8 when every answer is c', () => {
    const all: Record<string, 'c'> = {};
    for (const id of QUIZ_QUESTION_IDS) all[id] = 'c';
    expect(scoreQuiz(all as never)).toBe(8);
  });

  it('maps low scores to 1.5', () => {
    expect(scoreToStartingRating(0)).toBe(1.5);
    expect(scoreToStartingRating(1)).toBe(1.5);
  });

  it('maps mid-low to 2.5', () => {
    expect(scoreToStartingRating(2)).toBe(2.5);
    expect(scoreToStartingRating(3)).toBe(2.5);
  });

  it('maps mid to 3.5', () => {
    expect(scoreToStartingRating(4)).toBe(3.5);
    expect(scoreToStartingRating(5)).toBe(3.5);
  });

  it('maps high to 4.5', () => {
    expect(scoreToStartingRating(6)).toBe(4.5);
    expect(scoreToStartingRating(7)).toBe(4.5);
  });

  it('maps perfect to 5.5', () => {
    expect(scoreToStartingRating(8)).toBe(5.5);
  });

  it('handles fractional band edges (e.g. 1.5 -> 2.5 band)', () => {
    expect(scoreToStartingRating(1.5)).toBe(2.5);
    expect(scoreToStartingRating(3.5)).toBe(3.5);
  });

  it('quizStartingRating wires score+map together', () => {
    expect(
      quizStartingRating({
        tennisYears: 'c',
        padelMonths: 'c',
        backWall: 'c',
        attendance: 'c',
        serve: 'c',
        lob: 'c',
        bandejaVibora: 'c',
        tournaments: 'c',
      }),
    ).toBe(5.5);
    expect(quizStartingRating({})).toBe(1.5);
  });

  it('isValidQuizAnswers rejects junk', () => {
    expect(isValidQuizAnswers(null)).toBe(false);
    expect(isValidQuizAnswers('hi')).toBe(false);
    expect(isValidQuizAnswers({ tennisYears: 'z' })).toBe(false);
    expect(isValidQuizAnswers({ unknown: 'a' })).toBe(false);
    expect(isValidQuizAnswers({ tennisYears: 'b' })).toBe(true);
  });

  it('answer points match spec', () => {
    expect(ANSWER_POINTS.a).toBe(0);
    expect(ANSWER_POINTS.b).toBe(0.5);
    expect(ANSWER_POINTS.c).toBe(1);
  });
});
