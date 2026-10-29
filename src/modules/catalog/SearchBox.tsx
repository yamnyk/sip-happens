import { Input } from "#shared/ui/Input.js";
import { catalogStrings as t } from "./strings.js";

/** Search input with a clear button. */
export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.catalog.searchPlaceholder}
        aria-label={t.catalog.searchPlaceholder}
        autoComplete="off"
        className="pr-11"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t.catalog.searchClear}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400"
        >
          <span aria-hidden="true">{t.catalog.clearIcon}</span>
        </button>
      )}
    </div>
  );
}
