import { typeLabels } from '../strings';
import type { Drink, DrinkSubtype } from '../types/domain';

export const SUBTYPE_MAX = 40;

export type SubtypeError = 'subtype_empty' | 'subtype_too_long' | 'subtype_invalid_chars';

/** Identity of a subtype name. Mirrors name_normalized in the DB: NFC, trimmed, whitespace collapsed, lowercase. */
export function normalizeSubtypeName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Display form: trimmed, inner whitespace collapsed, casing kept. */
export function cleanSubtypeName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function validateSubtypeName(name: string): SubtypeError | null {
  const clean = cleanSubtypeName(name);
  if (clean.length === 0) return 'subtype_empty';
  if (Array.from(clean).length > SUBTYPE_MAX) return 'subtype_too_long';
  if (/\p{C}/u.test(clean)) return 'subtype_invalid_chars';
  return null;
}

/** The existing subtype that `name` duplicates (case- and whitespace-insensitive), or null. */
export function findDuplicateSubtype(name: string, subtypes: readonly DrinkSubtype[]): DrinkSubtype | null {
  const key = normalizeSubtypeName(name);
  if (!key) return null;
  return subtypes.find((s) => normalizeSubtypeName(s.name) === key) ?? null;
}

/** What to show as the drink's type: the custom subtype name for 'other' drinks, else the fixed label. */
export function drinkTypeLabel(
  drink: Pick<Drink, 'type' | 'subtype_id'>,
  subtypesById: ReadonlyMap<string, DrinkSubtype>,
): string {
  if (drink.type === 'other' && drink.subtype_id) {
    return subtypesById.get(drink.subtype_id)?.name ?? typeLabels.other;
  }
  return typeLabels[drink.type];
}
