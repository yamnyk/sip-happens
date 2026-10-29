import { Chip } from "#shared/ui/Chip.js";

/** Horizontally scrolling single-select chip row. */
export function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((f) => (
        <Chip
          key={f.id}
          type="button"
          onClick={() => onSelect(f.id)}
          selected={selected === f.id}
        >
          {f.label}
        </Chip>
      ))}
    </div>
  );
}
