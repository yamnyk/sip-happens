/** UI strings for the custom drink type picker. */
export const subtypeStrings = {
  heading: "Який саме напій?",
  existingLabel: "Вже є в системі",
  addLabel: "Додати новий тип",
  placeholder: "Наприклад: Віскі",
  addButton: "Додати",
  newBadge: "новий",
  required: "Обери тип зі списку або додай новий",
  duplicate: (name: string) =>
    `Тип «${name}» вже є. Обери його зі списку або впиши інший, унікальний`,
  errors: {
    subtype_empty: "Впиши назву типу",
    subtype_too_long: "Назва задовга (максимум 40 символів)",
    subtype_invalid_chars: "У назві є недопустимі символи",
  },
} as const;
