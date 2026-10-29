import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Drink } from "#contract/domain.js";
import { queryKeys } from "#shared/api/queries.js";
import { strings } from "#shared/strings.js";
import { Button } from "#shared/ui/Button.js";
import { ErrorText } from "#shared/ui/Status.js";
import { EditForm } from "./EditForm.js";
import { deleteDrink } from "./queries.js";
import { catalogStrings as t } from "./strings.js";

/** Edit toggle for the owner or an admin, plus the admin-only delete flow. */
export function AdminActions({
  drink,
  hasReviews,
  isAdmin,
}: {
  drink: Drink;
  hasReviews: boolean;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      await deleteDrink(drink.id);
    },
    onSuccess: () => {
      // Leave the page first so the deleted drink never renders as "not found".
      navigate("/", { replace: true });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.drinks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews }),
      ]);
    },
    onError: () => setDeleteError(true),
  });

  return (
    <section className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
      {editing ? (
        <EditForm
          drink={drink}
          hasReviews={hasReviews}
          onDone={() => setEditing(false)}
        />
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(true)}
        >
          {t.drink.edit}
        </Button>
      )}
      {isAdmin && (
        <>
          <Button
            type="button"
            variant="dangerSoft"
            disabled={del.isPending}
            onClick={() => {
              setDeleteError(false);
              if (window.confirm(t.drink.deleteConfirm)) del.mutate();
            }}
          >
            {t.drink.deleteDrink}
          </Button>
          {deleteError && <ErrorText>{strings.common.error}</ErrorText>}
        </>
      )}
    </section>
  );
}
