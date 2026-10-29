import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DRINK_TYPES, type Drink, type DrinkType } from "#contract/domain.js";
import { groupOf } from "#shared/config/criteria.js";
import { queryKeys } from "#shared/api/queries.js";
import { strings, typeLabels } from "#shared/strings.js";
import {
  EMPTY_SUBTYPE,
  SubtypePicker,
  hasSubtype,
  subtypeStrings,
  useEnsureSubtype,
  useSubtypeField,
} from "#modules/subtypes/index.js";
import { Button } from "#shared/ui/Button.js";
import { cardClass } from "#shared/ui/Card.js";
import { Chip } from "#shared/ui/Chip.js";
import { Input } from "#shared/ui/Input.js";
import { ErrorText } from "#shared/ui/Status.js";
import { DrinkFormError, saveErrorMessage } from "./drinkErrors.js";
import { updateDrink } from "./queries.js";
import { catalogStrings as t } from "./strings.js";

/** Inline form to rename a drink and change its type (limited to the same group once it has reviews). */
export function EditForm({
  drink,
  hasReviews,
  onDone,
}: {
  drink: Drink;
  hasReviews: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(drink.name);
  const [type, setType] = useState<DrinkType>(drink.type);
  const [error, setError] = useState<string | null>(null);
  const subtype = useSubtypeField({
    subtypeId: drink.subtype_id,
    newName: null,
  });
  const ensureSubtype = useEnsureSubtype();

  const allowed = DRINK_TYPES.filter(
    (ty) => !hasReviews || groupOf(ty) === groupOf(drink.type),
  );

  const save = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) throw new DrinkFormError("name_required");
      let subtypeId: string | null = null;
      if (type === "other") {
        if (!hasSubtype(subtype.value)) {
          subtype.setRequired(true);
          return false;
        }
        const ensured = await ensureSubtype(subtype.value);
        if ("duplicateOf" in ensured) {
          subtype.setValue({
            subtypeId: ensured.duplicateOf.id,
            newName: null,
          });
          subtype.setNotice(subtypeStrings.duplicate(ensured.duplicateOf.name));
          return false;
        }
        subtypeId = ensured.id;
        subtype.setValue({ subtypeId, newName: null });
      }
      await updateDrink(drink.id, {
        name: trimmed,
        type,
        subtype_id: subtypeId,
      });
      return true;
    },
    onSuccess: async (saved) => {
      if (!saved) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.drinks });
      onDone();
    },
    onError: (e: unknown) => setError(saveErrorMessage(e, t.drink)),
  });

  return (
    <form
      className={cardClass({}, "flex flex-col gap-3 p-4")}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-400">
        {t.drink.name}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-neutral-400">
        {t.drink.type}
        <div className="flex flex-wrap gap-2">
          {allowed.map((ty) => (
            <Chip
              key={ty}
              type="button"
              onClick={() => {
                setType(ty);
                if (ty !== "other") subtype.change(EMPTY_SUBTYPE);
              }}
              selected={type === ty}
            >
              {typeLabels[ty]}
            </Chip>
          ))}
        </div>
        {hasReviews && (
          <p className="text-xs text-neutral-500">{t.drink.typeLimited}</p>
        )}
      </div>
      {type === "other" && (
        <SubtypePicker
          value={subtype.value}
          onChange={subtype.change}
          showRequired={subtype.required}
          notice={subtype.notice}
        />
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={save.isPending}
          className="flex-1"
        >
          {strings.common.save}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onDone}
          className="flex-1"
        >
          {strings.common.cancel}
        </Button>
      </div>
    </form>
  );
}
