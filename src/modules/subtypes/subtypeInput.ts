import {
  cleanSubtypeName,
  findDuplicateSubtype,
  validateSubtypeName,
} from "#shared/lib/subtype.js";
import type { DrinkSubtype } from "#contract/domain.js";

type SubtypeNameError = NonNullable<ReturnType<typeof validateSubtypeName>>;

export type SubtypeCheck =
  | { kind: "invalid"; code: SubtypeNameError }
  | { kind: "duplicate"; duplicate: DrinkSubtype }
  | { kind: "ok"; name: string };

/**
 * Validates a typed new subtype name against the existing subtypes and the
 * not-yet-saved new name (if any). A pending duplicate has an empty id.
 */
export function checkNewSubtype(
  text: string,
  existing: readonly DrinkSubtype[],
  pendingNewName: string | null,
): SubtypeCheck {
  const code = validateSubtypeName(text);
  if (code) return { kind: "invalid", code };
  const pending: DrinkSubtype[] = pendingNewName
    ? [
        {
          id: "",
          name: pendingNewName,
          name_normalized: null,
          created_by: null,
          created_at: "",
        },
      ]
    : [];
  const duplicate = findDuplicateSubtype(text, [...existing, ...pending]);
  if (duplicate) return { kind: "duplicate", duplicate };
  return { kind: "ok", name: cleanSubtypeName(text) };
}
