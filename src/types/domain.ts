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

export interface Profile {
  id: string;
  nick: string;
  invited_by: string | null;
  is_admin: boolean;
  disabled: boolean;
  created_at: string;
}

/** Custom drink type that lives under the fixed type 'other' (whisky, rum, ...). */
export interface DrinkSubtype {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Drink {
  id: string;
  name: string;
  type: DrinkType;
  /** Set exactly when type is 'other'. Null only on legacy rows. */
  subtype_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  drink_id: string;
  author_id: string;
  first_scores: Scores | null;
  first_note: string | null;
  final_scores: Scores | null;
  final_note: string | null;
  created_at: string;
  updated_at: string;
}

export type LinkKind = "invite" | "reset";

export interface InviteLink {
  token: string;
  kind: LinkKind;
  created_by: string;
  target_user_id: string | null;
  created_at: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
}

export interface ResetRequest {
  id: string;
  nick: string;
  inviter_nick: string;
  user_id: string | null;
  inviter_matches: boolean;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
