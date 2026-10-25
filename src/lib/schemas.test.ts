import { describe, expect, it } from 'vitest';
import { passwordSchema } from './schemas';

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
