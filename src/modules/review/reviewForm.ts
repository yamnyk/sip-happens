import { CRITERIA } from "#shared/config/criteria.js";
import { fold, normalizeName } from "#shared/lib/text.js";
import type { ReviewDraft, StageDraft } from "#shared/lib/review.js";
import {
  DRINK_TYPES,
  type Drink,
  type DrinkGroup,
  type DrinkType,
  type Review,
} from "#contract/domain.js";
import { hasInput, type StageName } from "./drafts.js";

/** Max number of name suggestions shown under the input. */
const MAX_SUGGESTIONS = 6;

/** Stage draft built from a saved review, or null when the review has no input for that stage. */
export function stageFromReview(
  review: Review | undefined,
  stage: StageName,
): StageDraft | null {
  if (!review) return null;
  const d: StageDraft =
    stage === "first"
      ? {
          scores: { ...(review.first_scores ?? {}) },
          note: review.first_note ?? "",
        }
      : {
          scores: { ...(review.final_scores ?? {}) },
          note: review.final_note ?? "",
        };
  return hasInput(d) ? d : null;
}

/** Drops scores whose criterion does not exist in the group (criteria differ between wine and gin). */
export function pruneToGroup(
  group: DrinkGroup,
  draft: ReviewDraft,
): ReviewDraft {
  const allowed = new Set(CRITERIA[group].map((c) => c.key));
  const prune = (d: StageDraft): StageDraft => ({
    ...d,
    scores: Object.fromEntries(
      Object.entries(d.scores).filter(([k]) => allowed.has(k)),
    ),
  });
  return { first: prune(draft.first), final: prune(draft.final) };
}

/** Name and type encoded in a `?draft=<name>+<type>` context; an unknown type becomes null. */
export function parseDraftContext(context: string): {
  name: string;
  type: DrinkType | null;
} {
  const idx = context.lastIndexOf("+");
  const t = idx >= 0 ? context.slice(idx + 1) : "";
  return {
    name: idx >= 0 ? context.slice(0, idx) : context,
    type: (DRINK_TYPES as readonly string[]).includes(t)
      ? (t as DrinkType)
      : null,
  };
}

/** Drinks whose name contains the typed text. Empty once a drink is picked or while nothing is typed. */
export function filterSuggestions(
  drinks: readonly Drink[] | undefined,
  name: string,
  hasDrink: boolean,
): Drink[] {
  const q = fold(name);
  if (hasDrink || !q || !drinks) return [];
  return drinks
    .filter((d) => fold(d.name).includes(q))
    .slice(0, MAX_SUGGESTIONS);
}

/** Drink whose normalized name equals the typed one (only while no drink is picked). */
export function findExactMatch(
  drinks: readonly Drink[] | undefined,
  name: string,
  hasDrink: boolean,
): Drink | undefined {
  if (hasDrink || !name.trim()) return undefined;
  return drinks?.find(
    (d) => normalizeName(d.name.trim()) === normalizeName(name.trim()),
  );
}

/** Existing drink that collides with the typed name: normalized match first, then folded match. */
export function findConflict(
  list: readonly Drink[],
  name: string,
): Drink | undefined {
  const target = normalizeName(name.trim());
  return (
    list.find((d) => normalizeName(d.name.trim()) === target) ??
    list.find((d) => fold(d.name) === fold(name))
  );
}

interface SubmitInput {
  canSave: boolean;
  saving: boolean;
  exactMatch: Drink | undefined;
  effectiveType: DrinkType | null;
  hasDrink: boolean;
  name: string;
}

/** Whether the save button is enabled. */
export function canSubmit(i: SubmitInput): boolean {
  return (
    i.canSave &&
    !i.saving &&
    !i.exactMatch &&
    Boolean(i.effectiveType) &&
    (i.hasDrink || i.name.trim().length > 0)
  );
}

export type { StageName };

/** Draft with one score set, or removed when the value is undefined. */
export function withScore(
  draft: ReviewDraft,
  stage: StageName,
  key: string,
  value: number | undefined,
): ReviewDraft {
  const scores = { ...draft[stage].scores };
  if (value === undefined) delete scores[key];
  else scores[key] = value;
  return { ...draft, [stage]: { ...draft[stage], scores } };
}

/** Draft with one stage note replaced. */
export function withNote(
  draft: ReviewDraft,
  stage: StageName,
  note: string,
): ReviewDraft {
  return { ...draft, [stage]: { ...draft[stage], note } };
}
