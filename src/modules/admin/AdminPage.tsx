import { useMemo, useState } from "react";
import { useProfiles, useReviews } from "#shared/api/queries.js";
import { useSession } from "#modules/auth/index.js";
import { countByAuthor } from "#shared/lib/score.js";
import { apiErrors, strings } from "#shared/strings.js";
import { ErrorBanner, PageStatus, PageTitle } from "#shared/ui/Status.js";
import type { Profile } from "#contract/domain.js";
import { buildTree } from "./adminTree.js";
import {
  AdminApiError,
  useAdminUserAction,
  useDismissRequest,
  useResetRequests,
  useResolveReset,
} from "./queries.js";
import { adminStrings as t } from "./strings.js";
import { TreeList } from "./TreeList.js";
import { UnmatchedRequestCard } from "./UnmatchedRequestCard.js";
import { UserCard } from "./UserCard.js";

/** Admin screen: users, unmatched reset requests and the invite tree. */
export function AdminPage() {
  const { profile: me } = useSession();
  const profiles = useProfiles();
  const reviews = useReviews();
  const requests = useResetRequests();
  const resolve = useResolveReset(me?.id ?? "");
  const dismiss = useDismissRequest(me?.id ?? "");
  const userAction = useAdminUserAction();
  const [links, setLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const reviewCounts = useMemo(
    () => countByAuthor(reviews.data ?? []),
    [reviews.data],
  );

  const nickById = useMemo(
    () => new Map((profiles.data ?? []).map((p) => [p.id, p.nick])),
    [profiles.data],
  );
  const tree = useMemo(() => buildTree(profiles.data ?? []), [profiles.data]);

  const open = (requests.data ?? []).filter((r) => r.resolved_at === null);
  const pendingUserIds = new Set(
    open.flatMap((r) => (r.user_id ? [r.user_id] : [])),
  );
  const unmatched = open.filter((r) => r.user_id === null);

  if (profiles.isLoading || reviews.isLoading || requests.isLoading)
    return <PageStatus>{strings.common.loading}</PageStatus>;
  if (profiles.isError || reviews.isError || requests.isError)
    return <PageStatus tone="error">{strings.common.error}</PageStatus>;

  function reportError(e: unknown) {
    setError(
      e instanceof AdminApiError ? apiErrors[e.code] : strings.common.error,
    );
  }

  function onResolve(userId: string) {
    setError(null);
    resolve.mutate(userId, {
      onSuccess: (token) =>
        setLinks((prev) => ({
          ...prev,
          [userId]: `${location.origin}/reset/${token}`,
        })),
      onError: reportError,
    });
  }

  function onUserAction(p: Profile, action: "delete" | "ban" | "unban") {
    setError(null);
    if (action === "delete" && !window.confirm(t.deleteConfirm(p.nick))) return;
    userAction.mutate({ userId: p.id, action }, { onError: reportError });
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <PageTitle>{t.title}</PageTitle>
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-neutral-400">{t.users}</h2>
        <ul className="flex flex-col gap-2">
          {(profiles.data ?? []).map((p) => (
            <UserCard
              key={p.id}
              profile={p}
              inviterNick={
                p.invited_by ? (nickById.get(p.invited_by) ?? t.unknown) : null
              }
              reviewCount={reviewCounts.get(p.id) ?? 0}
              pending={pendingUserIds.has(p.id)}
              isMe={p.id === me?.id}
              link={links[p.id]}
              resolveDisabled={resolve.isPending}
              actionDisabled={userAction.isPending}
              onResolve={onResolve}
              onUserAction={onUserAction}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-neutral-400">{t.unmatched}</h2>
        {unmatched.length === 0 ? (
          <p className="text-neutral-500">{t.noUnmatched}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unmatched.map((r) => (
              <UnmatchedRequestCard
                key={r.id}
                request={r}
                dismissing={dismiss.isPending}
                onDismiss={(id) => dismiss.mutate(id, { onError: reportError })}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-neutral-400">{t.tree}</h2>
        <TreeList nodes={tree} />
      </section>
    </div>
  );
}
