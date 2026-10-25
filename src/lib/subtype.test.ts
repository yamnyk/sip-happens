import { describe, expect, it } from 'vitest';
import {
  cleanSubtypeName,
  drinkTypeLabel,
  findDuplicateSubtype,
  normalizeSubtypeName,
  validateSubtypeName,
} from './subtype';
import type { DrinkSubtype } from '../types/domain';

const sub = (id: string, name: string): DrinkSubtype => ({ id, name, created_by: null, created_at: '' });
const subtypes = [sub('1', 'Віскі'), sub('2', 'Ром')];

describe('normalizeSubtypeName', () => {
  it('ignores case, outer and repeated whitespace', () => {
    expect(normalizeSubtypeName('Zalupa')).toBe(normalizeSubtypeName('zalupa'));
    expect(normalizeSubtypeName('  Білий   ром ')).toBe(normalizeSubtypeName('білий ром'));
  });

  it('normalizes unicode composition', () => {
    expect(normalizeSubtypeName('é')).toBe(normalizeSubtypeName('é'));
  });
});

describe('validateSubtypeName', () => {
  it('accepts normal names', () => {
    expect(validateSubtypeName('Текіла')).toBeNull();
  });

  it('rejects empty, too long and control characters', () => {
    expect(validateSubtypeName('   ')).toBe('subtype_empty');
    expect(validateSubtypeName('a'.repeat(41))).toBe('subtype_too_long');
    expect(validateSubtypeName('a\u0000b')).toBe('subtype_invalid_chars');
  });
});

describe('findDuplicateSubtype', () => {
  it('finds an existing type regardless of case and spacing', () => {
    expect(findDuplicateSubtype('  віскі ', subtypes)?.id).toBe('1');
    expect(findDuplicateSubtype('РОМ', subtypes)?.id).toBe('2');
  });

  it('returns null for a new or blank name', () => {
    expect(findDuplicateSubtype('Горілка', subtypes)).toBeNull();
    expect(findDuplicateSubtype('   ', subtypes)).toBeNull();
  });
});

describe('cleanSubtypeName', () => {
  it('keeps casing but collapses whitespace', () => {
    expect(cleanSubtypeName('  Білий   Ром ')).toBe('Білий Ром');
  });
});

describe('drinkTypeLabel', () => {
  const byId = new Map(subtypes.map((s) => [s.id, s]));

  it('uses the subtype name for other drinks', () => {
    expect(drinkTypeLabel({ type: 'other', subtype_id: '1' }, byId)).toBe('Віскі');
  });

  it('falls back to the fixed label', () => {
    expect(drinkTypeLabel({ type: 'gin', subtype_id: null }, byId)).toBe('Джин');
    expect(drinkTypeLabel({ type: 'other', subtype_id: null }, byId)).toBe('Інше');
  });
});
