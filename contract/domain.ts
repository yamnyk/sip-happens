import type { Row } from "./database.js";

export const DRINK_TYPES = [
  "red",
  "white",
  "rose",
  "sparkling",
  "port",
  "gin",
  "other",
] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

export const DRINK_GROUPS = ["wine", "port", "gin", "other"] as const;
export type DrinkGroup = (typeof DRINK_GROUPS)[number];

/** Raw per-criterion scores, keyed by criterion key. Integers 0-10. */
export type Scores = Record<string, number>;

export type Profile = Row<"profiles">;

/** Custom drink type that lives under the fixed type 'other' (whisky, rum, ...). */
export type DrinkSubtype = Row<"drink_subtypes">;

/** `subtype_id` is set exactly when type is 'other'. Null only on legacy rows. */
export type Drink = Row<"drinks">;

export type Review = Row<"reviews">;

export type LinkKind = "invite" | "reset";

export type InviteLink = Row<"links">;

export type ResetRequest = Row<"reset_requests">;
