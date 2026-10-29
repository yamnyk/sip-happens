import { describe, expect, it } from 'vitest';
import { checkPassword, passwordSchema } from './schemas';

describe('passwordSchema', () => {
  it('accepts 8 to 72 bytes', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(72)).success).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('1234567').success).toBe(false);
  });

  it('counts bytes, not characters', () => {
    // 40 Cyrillic letters = 80 bytes
    expect(passwordSchema.safeParse('я'.repeat(40)).success).toBe(false);
    expect(passwordSchema.safeParse('я'.repeat(36)).success).toBe(true);
  });
});

describe('checkPassword', () => {
  it('matches passwordSchema', () => {
    for (const v of ['1234567', '12345678', 'a'.repeat(72), 'a'.repeat(73), 'я'.repeat(36), 'я'.repeat(37)]) {
      expect(checkPassword(v) === null).toBe(passwordSchema.safeParse(v).success);
    }
  });

  it('names the failed rule', () => {
    expect(checkPassword('1234567')).toBe('password_too_short');
    // 37 Cyrillic letters = 74 bytes, fewer than 72 characters
    expect(checkPassword('я'.repeat(37))).toBe('password_too_long');
  });
});
