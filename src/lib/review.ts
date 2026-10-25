import { CRITERIA, SCORE_MAX, SCORE_MIN } from '../config/criteria';
import type { DrinkGroup, Scores } from '../types/domain';
import { isCompleteScores } from './score';

export const FINAL_NOTE_MIN = 30;

export interface StageDraft {
  scores: Partial<Scores>;
  note: string;
}

export interface ReviewDraft {
  first: StageDraft;
  final: StageDraft;
}

export type ReviewErrorCode =
  | 'first_scores_incomplete'
  | 'scores_out_of_range'
  | 'final_note_too_short'
  | 'final_scores_required';

export type StageStatus = 'empty' | 'valid' | 'invalid';

export interface StageState {
  status: StageStatus;
  errors: ReviewErrorCode[];
}

export interface ReviewState {
  first: StageState;
  final: StageState;
  /** At least one stage valid and no stage invalid. */
  canSave: boolean;
}

export const emptyStage = (): StageDraft => ({ scores: {}, note: '' });
export const emptyDraft = (): ReviewDraft => ({ first: emptyStage(), final: emptyStage() });

function filledKeys(scores: Partial<Scores>): string[] {
  return Object.entries(scores)
    .filter(([, v]) => typeof v === 'number' && !Number.isNaN(v))
    .map(([k]) => k);
}

function hasInput(stage: StageDraft): boolean {
  return filledKeys(stage.scores).length > 0 || stage.note.trim().length > 0;
}

function scoresInRange(group: DrinkGroup, scores: Partial<Scores>): boolean {
  const allowed = new Set(CRITERIA[group].map((c) => c.key));
  return filledKeys(scores).every((k) => {
    const v = scores[k];
    return allowed.has(k) && Number.isInteger(v) && (v as number) >= SCORE_MIN && (v as number) <= SCORE_MAX;
  });
}

/**
 * Per-stage validity. A stage with any input but invalid blocks saving;
 * input is never silently dropped.
 */
export function evaluateReview(group: DrinkGroup, draft: ReviewDraft): ReviewState {
  const first: StageState = { status: 'empty', errors: [] };
  if (hasInput(draft.first)) {
    if (!scoresInRange(group, draft.first.scores)) first.errors.push('scores_out_of_range');
    else if (!isCompleteScores(group, draft.first.scores)) first.errors.push('first_scores_incomplete');
    first.status = first.errors.length === 0 ? 'valid' : 'invalid';
  }

  const final: StageState = { status: 'empty', errors: [] };
  if (hasInput(draft.final)) {
    if (!scoresInRange(group, draft.final.scores)) final.errors.push('scores_out_of_range');
    if (draft.final.note.trim().length < FINAL_NOTE_MIN) final.errors.push('final_note_too_short');
    if (first.status !== 'valid' && !isCompleteScores(group, draft.final.scores)) {
      final.errors.push('final_scores_required');
    }
    final.status = final.errors.length === 0 ? 'valid' : 'invalid';
  }

  const noneInvalid = first.status !== 'invalid' && final.status !== 'invalid';
  const anyValid = first.status === 'valid' || final.status === 'valid';
  return { first, final, canSave: noneInvalid && anyValid };
}

export interface ReviewRow {
  first_scores: Scores | null;
  first_note: string | null;
  final_scores: Scores | null;
  final_note: string | null;
}

function pick(group: DrinkGroup, scores: Partial<Scores>): Scores | null {
  const out: Scores = {};
  for (const c of CRITERIA[group]) {
    const v = scores[c.key];
    if (typeof v === 'number') out[c.key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Maps a valid draft to DB columns. Call only when `state.canSave`. */
export function toReviewRow(group: DrinkGroup, draft: ReviewDraft, state: ReviewState): ReviewRow {
  const firstValid = state.first.status === 'valid';
  const finalValid = state.final.status === 'valid';
  return {
    first_scores: firstValid ? pick(group, draft.first.scores) : null,
    first_note: firstValid ? draft.first.note.trim() || null : null,
    final_scores: finalValid ? pick(group, draft.final.scores) : null,
    final_note: finalValid ? draft.final.note.trim() : null,
  };
}
