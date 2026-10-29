import { createClient } from "@supabase/supabase-js";

const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey: string | undefined = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env var VITE_SUPABASE_URL");
}

if (!supabaseKey) {
  throw new Error("Missing env var VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
