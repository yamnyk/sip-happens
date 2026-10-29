import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "#shared/api/queries.js";
import { supabase } from "#shared/api/supabase.js";
import type { DrinkType } from "#contract/domain.js";
import type { toReviewRow } from "#shared/lib/review.js";

type ReviewRow = ReturnType<typeof toReviewRow>;

/** Postgres unique violation: a drink with the same name already exists. */
const UNIQUE_VIOLATION = "23505";

/** Inserts a drink. Resolves `{ duplicate: true }` on a unique violation so the caller can offer the existing one; throws on any other error. */
export async function createDrink(input: {
  name: string;
  type: DrinkType;
  subtypeId: string | null;
}): Promise<{ id: string } | { duplicate: true }> {
  const { data, error } = await supabase
    .from("drinks")
    .insert({
      name: input.name,
      type: input.type,
      subtype_id: input.subtypeId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { duplicate: true };
    throw error;
  }
  return { id: data.id };
}

/** Updates a review. Resolves false when no row changed (RLS or a delete on another device turns the update into a silent no-op). */
export async function updateReview(
  id: string,
  row: ReviewRow,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("reviews")
    .update(row)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return Boolean(data?.length);
}

/** Inserts a review for a drink. */
export async function insertReview(
  drinkId: string,
  row: ReviewRow,
): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .insert({ drink_id: drinkId, ...row });
  if (error) throw error;
}

/** Deletes a review by id; `onDeleted` runs before the reviews cache is invalidated. */
export function useDeleteReview(onDeleted?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      // RLS denies silently (0 rows), e.g. after a ban.
      if (!data?.length) throw new Error("review_not_deleted");
    },
    onSuccess: async () => {
      onDeleted?.();
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
    },
  });
}
