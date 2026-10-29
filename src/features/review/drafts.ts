import { del, get, keys, set } from "idb-keyval";
import { DRINK_TYPES, type DrinkType, type Scores } from "../../types/domain";
import { normalizeNick } from "../../lib/nick";
import type { StageDraft } from "../../lib/review";
import type { SubtypeValue } from "../subtypes/useEnsureSubtype";

export type StageName = "first" | "final";
export const STAGES: readonly StageName[] = ["first", "final"];

/** Accent- and case-insensitive text folding for autocomplete. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Context part of a draft key: the drink id, or normalized name plus type for a not-yet-created drink. */
export function draftContext(
  drinkId: string | null,
  name: string,
  type: DrinkType | null,
): string | null {
  if (drinkId) return drinkId;
  const n = normalizeNick(name.trim());
  if (!n || !type) return null;
  return `${n}+${type}`;
}

const draftKey = (userId: string, context: string, stage: StageName) =>
  `draft:${userId}:${context}:${stage}`;

const draftMetaKey = (userId: string, context: string) =>
  `draft:${userId}:${context}:meta`;

interface ParsedDraftKey {
  userId: string;
  context: string;
  segment: StageName | "meta";
}

/** Splits a draft key. userId has no colons; context may contain colons; the segment follows the last colon. */
export function parseDraftKey(key: string): ParsedDraftKey | null {
  if (!key.startsWith("draft:")) return null;
  const rest = key.slice("draft:".length);
  const first = rest.indexOf(":");
  const last = rest.lastIndexOf(":");
  if (first <= 0 || last <= first) return null;
  const userId = rest.slice(0, first);
  const context = rest.slice(first + 1, last);
  const segment = rest.slice(last + 1);
  if (!context) return null;
  if (segment !== "first" && segment !== "final" && segment !== "meta")
    return null;
  return { userId, context, segment };
}

export function hasInput(stage: StageDraft): boolean {
  return (
    Object.values(stage.scores).some((v) => typeof v === "number") ||
    stage.note.trim().length > 0
  );
}

function parse(raw: unknown): StageDraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as { scores?: unknown; note?: unknown };
  if (
    typeof r.scores !== "object" ||
    r.scores === null ||
    typeof r.note !== "string"
  )
    return null;
  const scores: Scores = {};
  for (const [k, v] of Object.entries(r.scores))
    if (typeof v === "number") scores[k] = v;
  return { scores, note: r.note };
}

export async function loadStageDraft(
  userId: string,
  context: string,
  stage: StageName,
): Promise<StageDraft | null> {
  try {
    return parse(await get(draftKey(userId, context, stage)));
  } catch {
    return null;
  }
}

export async function saveStageDraft(
  userId: string,
  context: string,
  stage: StageName,
  d: StageDraft,
): Promise<void> {
  try {
    if (hasInput(d)) await set(draftKey(userId, context, stage), d);
    else await del(draftKey(userId, context, stage));
  } catch {
    // IndexedDB unavailable (private mode etc.): drafts are best-effort.
  }
}

interface DraftMeta {
  name: string;
  type: DrinkType | null;
  subtype: SubtypeValue;
  updatedAt: number;
}

function parseMeta(raw: unknown): DraftMeta | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as {
    name?: unknown;
    type?: unknown;
    subtype?: unknown;
    updatedAt?: unknown;
  };
  if (typeof r.name !== "string") return null;
  const type =
    typeof r.type === "string" &&
    (DRINK_TYPES as readonly string[]).includes(r.type)
      ? (r.type as DrinkType)
      : null;
  const st = (
    typeof r.subtype === "object" && r.subtype !== null ? r.subtype : {}
  ) as { subtypeId?: unknown; newName?: unknown };
  return {
    name: r.name,
    type,
    subtype: {
      subtypeId: typeof st.subtypeId === "string" ? st.subtypeId : null,
      newName: typeof st.newName === "string" ? st.newName : null,
    },
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

export async function saveDraftMeta(
  userId: string,
  context: string,
  meta: DraftMeta,
): Promise<void> {
  try {
    await set(draftMetaKey(userId, context), meta);
  } catch {
    // best-effort
  }
}

export async function loadDraftMeta(
  userId: string,
  context: string,
): Promise<DraftMeta | null> {
  try {
    return parseMeta(await get(draftMetaKey(userId, context)));
  } catch {
    return null;
  }
}

export interface DraftEntry {
  context: string;
  stages: StageName[];
  meta: DraftMeta | null;
}

/** All contexts of this user that have stage input, newest meta first. Never throws. */
export async function listDrafts(userId: string): Promise<DraftEntry[]> {
  try {
    const prefix = `draft:${userId}:`;
    const contexts = new Set<string>();
    for (const k of await keys()) {
      if (typeof k !== "string" || !k.startsWith(prefix)) continue;
      const parsed = parseDraftKey(k);
      if (parsed && parsed.userId === userId) contexts.add(parsed.context);
    }
    const entries = await Promise.all(
      [...contexts].map(async (context): Promise<DraftEntry> => {
        const [drafts, meta] = await Promise.all([
          Promise.all(STAGES.map((st) => loadStageDraft(userId, context, st))),
          loadDraftMeta(userId, context),
        ]);
        const stages = STAGES.filter((_, i) => {
          const d = drafts[i];
          return d !== null && hasInput(d);
        });
        return { context, stages, meta };
      }),
    );
    return entries
      .filter((e) => e.stages.length > 0)
      .sort((a, b) => (b.meta?.updatedAt ?? 0) - (a.meta?.updatedAt ?? 0));
  } catch {
    return [];
  }
}

export async function clearDrafts(
  userId: string,
  context: string,
): Promise<void> {
  try {
    await Promise.all([
      ...STAGES.map((s) => del(draftKey(userId, context, s))),
      del(draftMetaKey(userId, context)),
    ]);
  } catch {
    // best-effort
  }
}
