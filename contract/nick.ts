const NICK_MIN = 3;
const NICK_MAX = 24;
const EMAIL_DOMAIN = "sip.invalid";

export type NickError =
  | "nick_too_short"
  | "nick_too_long"
  | "nick_whitespace"
  | "nick_invalid_chars"
  | "nick_mixed_scripts";

/** Case-insensitive identity of a nick. Mirrors lower(normalize(nick, NFC)) in the DB. */
export function normalizeNick(nick: string): string {
  return nick.normalize("NFC").toLowerCase();
}

/** Registration rules only. Existing nicks are never re-validated (login and reset lookups skip this). */
export function validateNick(nick: string): NickError | null {
  if (nick !== nick.trim()) return "nick_whitespace";
  const length = Array.from(nick).length;
  if (length < NICK_MIN) return "nick_too_short";
  if (length > NICK_MAX) return "nick_too_long";
  if (/\p{C}/u.test(nick)) return "nick_invalid_chars";
  if (/\p{Script=Latin}/u.test(nick) && /\p{Script=Cyrillic}/u.test(nick))
    return "nick_mixed_scripts";
  return null;
}

/** Deterministic synthetic email for Supabase Auth. Works in browsers and Node 20+. */
export async function nickToEmail(nick: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeNick(nick));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 32)}@${EMAIL_DOMAIN}`;
}
