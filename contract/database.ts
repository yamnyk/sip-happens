import type { Database as Generated } from "./database.types.js";
import type { DrinkType, LinkKind, Scores } from "./domain.js";

type GeneratedTables = Generated["public"]["Tables"];

/** Narrows columns the generator can only type loosely (CHECK lists, jsonb). Insert/Update stay generated. */
type PatchRow<K extends keyof GeneratedTables, R> = Omit<
  GeneratedTables[K],
  "Row"
> & { Row: Omit<GeneratedTables[K]["Row"], keyof R> & R };

/** Database type for typed Supabase clients. Regenerate `database.types.ts`, never edit it by hand. */
export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Tables"> & {
    Tables: Omit<GeneratedTables, "drinks" | "links" | "reviews"> & {
      drinks: PatchRow<"drinks", { type: DrinkType }>;
      links: PatchRow<"links", { kind: LinkKind }>;
      reviews: PatchRow<
        "reviews",
        { first_scores: Scores | null; final_scores: Scores | null }
      >;
    };
  };
};

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
