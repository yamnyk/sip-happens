import { describe, expect, it } from 'vitest';
import { parseDraftKey } from './drafts';

const U = '3f2b8c1e-5a47-4d0b-9c1a-0e7d6b2a4f10';

describe('parseDraftKey', () => {
  it('parses a stage key for a drink id', () => {
    const id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    expect(parseDraftKey(`draft:${U}:${id}:first`)).toEqual({ userId: U, context: id, segment: 'first' });
    expect(parseDraftKey(`draft:${U}:${id}:final`)).toEqual({ userId: U, context: id, segment: 'final' });
  });

  it('parses a meta key', () => {
    expect(parseDraftKey(`draft:${U}:abc:meta`)).toEqual({ userId: U, context: 'abc', segment: 'meta' });
  });

  it('keeps colons and plus signs inside the context', () => {
    expect(parseDraftKey(`draft:${U}:quinta: do noval+port:final`)).toEqual({
      userId: U,
      context: 'quinta: do noval+port',
      segment: 'final',
    });
    expect(parseDraftKey(`draft:${U}:a+b+c+red:meta`)).toEqual({ userId: U, context: 'a+b+c+red', segment: 'meta' });
  });

  it('returns null for foreign or malformed keys', () => {
    expect(parseDraftKey('other:key')).toBeNull();
    expect(parseDraftKey('')).toBeNull();
    expect(parseDraftKey('draft:')).toBeNull();
    expect(parseDraftKey(`draft:${U}`)).toBeNull();
    expect(parseDraftKey(`draft:${U}:first`)).toBeNull();
    expect(parseDraftKey(`draft:${U}::first`)).toBeNull();
    expect(parseDraftKey(`draft:${U}:abc:unknown`)).toBeNull();
    expect(parseDraftKey('draft::abc:first')).toBeNull();
  });
});
