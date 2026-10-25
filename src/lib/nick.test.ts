import { describe, expect, it } from 'vitest';
import { nickToEmail, normalizeNick, validateNick } from './nick';

describe('normalizeNick', () => {
  it('is case-insensitive and NFC-normalized', () => {
    expect(normalizeNick('Іван')).toBe(normalizeNick('іВАН'));
    expect(normalizeNick('é')).toBe(normalizeNick('é'));
  });
});

describe('validateNick', () => {
  it('accepts unicode nicks within 3-24 characters', () => {
    expect(validateNick('Гоги')).toBeNull();
    expect(validateNick('abc')).toBeNull();
    expect(validateNick('a'.repeat(24))).toBeNull();
  });

  it('rejects bad nicks', () => {
    expect(validateNick('ab')).toBe('nick_too_short');
    expect(validateNick('a'.repeat(25))).toBe('nick_too_long');
    expect(validateNick(' abc')).toBe('nick_whitespace');
    expect(validateNick('abc ')).toBe('nick_whitespace');
    expect(validateNick('a\u0000bc')).toBe('nick_invalid_chars');
  });
});

describe('nickToEmail', () => {
  it('is deterministic and case-insensitive', async () => {
    expect(await nickToEmail('Gogi')).toBe(await nickToEmail('gOGI'));
  });

  it('differs per nick', async () => {
    expect(await nickToEmail('gogi')).not.toBe(await nickToEmail('gogi2'));
  });

  it('has the expected shape and works for Cyrillic nicks', async () => {
    expect(await nickToEmail('Гоги')).toMatch(/^[0-9a-f]{32}@sip\.invalid$/);
  });
});
