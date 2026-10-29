/** Validation failure raised before the drink is saved; carries a code, not text. */
export class DrinkFormError extends Error {
  code: "name_required";
  constructor(code: "name_required") {
    super(code);
    this.code = code;
  }
}

/** Maps a save failure to a message by error code, never by comparing message text. */
export function saveErrorMessage(
  e: unknown,
  messages: { nameRequired: string; saveError: string },
): string {
  if (e instanceof DrinkFormError && e.code === "name_required")
    return messages.nameRequired;
  return messages.saveError;
}
