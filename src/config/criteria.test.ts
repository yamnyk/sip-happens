import { describe, expect, it } from 'vitest';
import { CRITERIA, TYPE_TO_GROUP, criteriaFor } from './criteria';
import { DRINK_GROUPS, DRINK_TYPES } from '../types/domain';

describe('criteria config', () => {
  it.each(DRINK_GROUPS)('weights of group %s sum to 100', (group) => {
    const sum = CRITERIA[group].reduce((acc, c) => acc + c.weight, 0);
    expect(sum).toBe(100);
  });

  it.each(DRINK_GROUPS)('group %s has 4 unique criterion keys', (group) => {
    const keys = CRITERIA[group].map((c) => c.key);
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(4);
  });

  it('every drink type maps to a configured group', () => {
    for (const type of DRINK_TYPES) {
      expect(CRITERIA[TYPE_TO_GROUP[type]]).toBeDefined();
      expect(criteriaFor(type)).toBe(CRITERIA[TYPE_TO_GROUP[type]]);
    }
  });

  it('all wine colors share the wine group', () => {
    for (const t of ['red', 'white', 'rose', 'sparkling'] as const) expect(TYPE_TO_GROUP[t]).toBe('wine');
  });
});
