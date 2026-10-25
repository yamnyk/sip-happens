import { useMemo } from 'react';
import { Link } from 'react-router';
import { useProfiles, useReviews } from '../../data/queries';
import { strings } from '../../strings';
import { browseStrings as t } from './strings';

export default function PeoplePage() {
  const profiles = useProfiles();
  const reviews = useReviews();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reviews.data ?? []) m.set(r.author_id, (m.get(r.author_id) ?? 0) + 1);
    return m;
  }, [reviews.data]);

  if (profiles.isLoading || reviews.isLoading) return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (profiles.isError || reviews.isError) return <p className="py-4 text-rose-300">{strings.common.error}</p>;

  const list = (profiles.data ?? []).filter((p) => !p.disabled);

  return (
    <ul className="flex flex-col gap-2 py-2">
      {list.map((p) => (
        <li key={p.id}>
          <Link
            to={`/people/${p.id}`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-neutral-900 px-4 py-3 active:bg-neutral-800"
          >
            <span className="truncate font-medium">{p.nick}</span>
            <span className="shrink-0 text-sm text-neutral-400">{t.people.reviewsCount(counts.get(p.id) ?? 0)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
