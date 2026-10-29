import type { NickError } from "./lib/nick";
import type { ReviewErrorCode } from "./lib/review";
import type { ApiErrorCode } from "./lib/schemas";
import type { DrinkType } from "./types/domain";

/** Shared UI strings. Feature-specific strings live in each feature's own strings.ts. */
export const strings = {
  appName: "sip-happens",
  tabs: { catalog: "Каталог", add: "Додати", mine: "Мої", people: "Люди" },
  nav: { invites: "Запрошення", admin: "Адмінка", logout: "Вийти" },
  common: {
    loading: "Завантаження...",
    save: "Зберегти",
    cancel: "Скасувати",
    error: "Щось пішло не так. Спробуй ще раз.",
    retry: "Спробувати ще раз",
  },
  stage: { first: "Перше враження", final: "Фінал" },
} as const;

export const typeLabels: Record<DrinkType, string> = {
  red: "Червоне",
  white: "Біле",
  rose: "Рожеве",
  sparkling: "Ігристе",
  port: "Портвейн",
  gin: "Джин",
  other: "Інше",
};

export const nickErrors: Record<NickError, string> = {
  nick_too_short: "Нік закороткий (мінімум 3 символи)",
  nick_too_long: "Нік задовгий (максимум 24 символи)",
  nick_whitespace: "Прибери пробіли на початку і в кінці",
  nick_invalid_chars: "У ніку є недопустимі символи",
};

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

export const reviewErrors: Record<ReviewErrorCode, string> = {
  first_scores_incomplete: "Постав усі оцінки або очисти цей етап",
  scores_out_of_range: "Оцінка має бути цілим числом від 0 до 10",
  final_note_too_short:
    "Напиши хоча б одне змістовне речення (від 30 символів)",
  final_scores_required: "Без першого враження в фіналі потрібні всі оцінки",
};

export const apiErrors: Record<ApiErrorCode, string> = {
  invalid_input: "Перевір введені дані",
  invalid_token:
    "Це посилання вже не діє. Попроси того, хто запросив, згенерувати нове",
  nick_taken: "Цей нік вже зайнятий",
  rate_limited: "Забагато спроб. Спробуй пізніше",
  unauthorized: "Потрібно увійти",
  forbidden: "Недостатньо прав",
  server_error: "Помилка сервера. Спробуй ще раз",
};
