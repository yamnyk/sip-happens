import { drinkTypeLabel } from "#shared/lib/subtype.js";
import { typeLabels } from "#shared/strings.js";
import type { Drink, DrinkSubtype, Review } from "#contract/domain.js";
import type { DraftEntry } from "./drafts.js";
import { reviewStrings } from "./strings.js";

const s = reviewStrings.mine;

type SubtypesById = ReadonlyMap<string, DrinkSubtype>;

/** Title of a draft row: the drink name, or the draft meta name, or the unnamed placeholder. */
export function draftTitle(
  drink: Pick<Drink, "name"> | undefined,
  meta: DraftEntry["meta"],
  gone: boolean,
): string {
  return drink?.name ?? (gone ? s.draftUnnamed : meta?.name || s.draftUnnamed);
}

/** Type text of a draft row: from the drink when it exists, else from the draft meta, else null. */
export function draftTypeText(
  drink: Pick<Drink, "type" | "subtype_id"> | undefined,
  meta: DraftEntry["meta"],
  subtypesById: SubtypesById,
): string | null {
  if (drink) return drinkTypeLabel(drink, subtypesById);
  if (!meta?.type) return null;
  if (meta.type === "other" && meta.subtype.subtypeId)
    return subtypesById.get(meta.subtype.subtypeId)?.name ?? typeLabels.other;
  if (meta.type === "other" && meta.subtype.newName)
    return s.draftNewSubtype(meta.subtype.newName);
  return typeLabels[meta.type];
}

/** Caption under the score of a review row. */
export function reviewStatusLabel(
  score: number | null,
  review: Pick<Review, "final_scores" | "final_note">,
): string {
  if (score === null) return s.noScore;
  return review.final_scores && review.final_note ? s.hasFinal : s.onlyFirst;
}

/** The author's reviews paired with their drinks; reviews of unknown drinks are dropped. */
export function myReviewItems<D extends Pick<Drink, "id">>(
  userId: string,
  drinks: readonly D[],
  reviews: readonly Review[],
): { review: Review; drink: D }[] {
  return reviews
    .filter((r) => r.author_id === userId)
    .flatMap((r) => {
      const drink = drinks.find((d) => d.id === r.drink_id);
      return drink ? [{ review: r, drink }] : [];
    });
}
