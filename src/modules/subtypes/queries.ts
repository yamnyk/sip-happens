import { supabase } from "#shared/api/supabase.js";

/** Inserts a drink subtype by name. Resolves to the new id; throws the Supabase error (code 23505 on duplicate name). */
export async function insertSubtype(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("drink_subtypes")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
