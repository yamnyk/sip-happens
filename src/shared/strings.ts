import type { NickError } from "#contract/nick.js";
import type { ReviewErrorCode } from "#shared/lib/review.js";
import type { ApiErrorCode } from "#contract/schemas.js";
import type { DrinkType } from "#contract/domain.js";

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
