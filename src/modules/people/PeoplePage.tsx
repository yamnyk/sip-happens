import { useMemo } from "react";
import { Link } from "react-router";
import { useProfiles, useReviews } from "#shared/api/queries.js";
import { countByAuthor } from "#shared/lib/score.js";
import { strings } from "#shared/strings.js";
import { peopleStrings as t } from "./strings.js";
import { cardClass } from "#shared/ui/Card.js";
import { PageStatus } from "#shared/ui/Status.js";

export function PeoplePage() {
  const profiles = useProfiles();
  const reviews = useReviews();

  const counts = useMemo(
    () => countByAuthor(reviews.data ?? []),
    [reviews.data],
  );

  if (profiles.isLoading || reviews.isLoading)
    return <PageStatus>{strings.common.loading}</PageStatus>;
  if (profiles.isError || reviews.isError)
    return <PageStatus tone="error">{strings.common.error}</PageStatus>;

  const list = (profiles.data ?? []).filter((p) => !p.disabled);

  return (
    <ul className="flex flex-col gap-2 py-2">
      {list.map((p) => (
        <li key={p.id}>
          <Link
            to={`/people/${p.id}`}
            className={cardClass(
              {},
              "flex min-h-14 items-center justify-between gap-3 px-4 py-3 active:bg-neutral-800",
            )}
          >
            <span className="truncate font-medium">{p.nick}</span>
            <span className="shrink-0 text-sm text-neutral-400">
              {t.people.reviewsCount(counts.get(p.id) ?? 0)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
