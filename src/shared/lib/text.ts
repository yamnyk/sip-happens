/** Case- and accent-insensitive normal form: NFD, combining marks stripped, lowercase, trimmed. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Identity of a drink name: NFC, lowercase (same rule the DB uses for names). Trim before calling. */
export function normalizeName(name: string): string {
  return name.normalize("NFC").toLowerCase();
}
