import { useMemo, useState } from "react";
import { useSession } from "#modules/auth/index.js";
import { useDrinks, useReviews } from "#shared/api/queries.js";
import { strings } from "#shared/strings.js";
import { useSubtypesById } from "#modules/subtypes/index.js";
import { PageStatus, PageTitle } from "#shared/ui/Status.js";
import { DraftCard } from "./DraftCard.js";
import { MyReviewCard } from "./MyReviewCard.js";
import { draftTypeText, myReviewItems } from "./myReviews.js";
import { useDeleteReview } from "./queries.js";
import { reviewStrings } from "./strings.js";
import { useDraftList } from "./useDraftList.js";

const s = reviewStrings.mine;

export function MyReviewsPage() {
  const { profile } = useSession();
  const drinksQ = useDrinks();
  const reviewsQ = useReviews();
  const subtypesById = useSubtypesById();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmDraft, setConfirmDraft] = useState<string | null>(null);
  const { drafts, remove: removeDraft } = useDraftList(profile?.id);

  const remove = useDeleteReview(() => setConfirmId(null));

  const items = useMemo(() => {
    if (!profile || !drinksQ.data || !reviewsQ.data) return [];
    return myReviewItems(profile.id, drinksQ.data, reviewsQ.data);
  }, [profile, drinksQ.data, reviewsQ.data]);

  if (drinksQ.isLoading || reviewsQ.isLoading)
    return <PageStatus>{strings.common.loading}</PageStatus>;
  if (drinksQ.isError || reviewsQ.isError)
    return <PageStatus tone="error">{s.loadFailed}</PageStatus>;

  return (
    <div className="flex flex-col gap-4 py-2">
      <PageTitle>{s.title}</PageTitle>
      {items.length === 0 && drafts.length === 0 && (
        <p className="text-neutral-500">{s.empty}</p>
      )}
      {drafts.length > 0 && (
        <section className="flex flex-col gap-3" aria-label={s.draftsTitle}>
          <h2 className="text-sm font-medium text-neutral-400">
            {s.draftsTitle}
          </h2>
          <ul className="flex flex-col gap-3">
            {drafts.map((entry) => {
              const drink = drinksQ.data?.find((d) => d.id === entry.context);
              return (
                <DraftCard
                  key={entry.context}
                  entry={entry}
                  drink={drink}
                  typeText={draftTypeText(drink, entry.meta, subtypesById)}
                  confirming={confirmDraft === entry.context}
                  onAskDelete={() => setConfirmDraft(entry.context)}
                  onCancel={() => setConfirmDraft(null)}
                  onConfirmDelete={() => {
                    void removeDraft(entry.context).then(() =>
                      setConfirmDraft(null),
                    );
                  }}
                />
              );
            })}
          </ul>
        </section>
      )}
      {drafts.length > 0 && items.length > 0 && (
        <h2 className="text-sm font-medium text-neutral-400">
          {s.reviewsTitle}
        </h2>
      )}
      <ul className="flex flex-col gap-3">
        {items.map(({ review, drink }) => (
          <MyReviewCard
            key={review.id}
            review={review}
            drink={drink}
            subtypesById={subtypesById}
            confirming={confirmId === review.id}
            deleting={remove.isPending}
            deleteFailed={remove.isError}
            onAskDelete={() => {
              remove.reset();
              setConfirmId(review.id);
            }}
            onCancel={() => setConfirmId(null)}
            onConfirmDelete={() => remove.mutate(review.id)}
          />
        ))}
      </ul>
    </div>
  );
}
