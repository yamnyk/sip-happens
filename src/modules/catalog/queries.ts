import { supabase } from "#shared/api/supabase.js";
import type { DrinkType } from "#contract/domain.js";

/** Updates a drink; throws when RLS silently denies the write (0 rows). */
export async function updateDrink(
  id: string,
  patch: { name: string; type: DrinkType; subtype_id: string | null },
): Promise<void> {
  const { data, error } = await supabase
    .from("drinks")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // RLS denies silently (0 rows) once someone else has reviewed the drink.
  if (!data?.length) throw new Error("drink_not_updated");
}

/** Deletes a drink; throws when RLS silently denies the delete (0 rows). */
export async function deleteDrink(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("drinks")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // RLS denies silently (0 rows) once someone else has reviewed the drink.
  if (!data?.length) throw new Error("drink_not_deleted");
}
