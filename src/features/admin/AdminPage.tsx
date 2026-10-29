import { useMemo, useState } from "react";
import { useProfiles, useReviews } from "../../data/queries";
import { useSession } from "../../app/session";
import { apiErrors, strings } from "../../strings";
import type { Profile, ResetRequest } from "../../types/domain";
import {
  AdminApiError,
  useAdminUserAction,
  useDismissRequest,
  useResetRequests,
  useResolveReset,
} from "./hooks";
import { adminStrings as t } from "./strings";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function WarnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0 text-amber-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={t.resetPending}
    >
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-950 p-3">
      <p className="text-sm text-neutral-300">{t.linkReady}</p>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-11 rounded-lg bg-neutral-900 px-3 text-sm text-neutral-100"
      />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            .writeText(url)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
        className="min-h-11 rounded-lg bg-amber-400 font-medium text-neutral-950"
      >
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}

interface TreeNode {
  profile: Profile;
  children: TreeNode[];
}

function buildTree(profiles: readonly Profile[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(
    profiles.map((p) => [p.id, { profile: p, children: [] }]),
  );
  const roots: TreeNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.profile.invited_by
      ? nodes.get(n.profile.invited_by)
      : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  return roots;
}

function TreeList({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="flex flex-col gap-1 border-l border-neutral-800 pl-3">
      {nodes.map((n) => (
        <li key={n.profile.id}>
          <p className="py-1">
            <span
              className={
                n.profile.disabled
                  ? "text-neutral-500 line-through"
                  : "font-medium"
              }
            >
              {n.profile.nick}
            </span>{" "}
            <span className="text-xs text-neutral-500">
              {fmt(n.profile.created_at)}
            </span>
          </p>
          {n.children.length > 0 && <TreeList nodes={n.children} />}
        </li>
      ))}
    </ul>
  );
}

export default function AdminPage() {
  const { profile: me } = useSession();
  const profiles = useProfiles();
  const reviews = useReviews();
  const requests = useResetRequests();
  const resolve = useResolveReset(me?.id ?? "");
  const dismiss = useDismissRequest(me?.id ?? "");
  const userAction = useAdminUserAction();
  const [links, setLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const reviewCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reviews.data ?? [])
      m.set(r.author_id, (m.get(r.author_id) ?? 0) + 1);
    return m;
  }, [reviews.data]);

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
    return <p className="py-4 text-neutral-400">{strings.common.loading}</p>;
  if (profiles.isError || reviews.isError || requests.isError)
    return <p className="py-4 text-rose-300">{strings.common.error}</p>;

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

  const btn = "min-h-11 rounded-lg px-3 text-sm";

  return (
    <div className="flex flex-col gap-6 py-2">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      {error && (
        <p className="rounded-lg bg-rose-500/20 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-neutral-400">{t.users}</h2>
        <ul className="flex flex-col gap-2">
          {(profiles.data ?? []).map((p) => {
            const pending = pendingUserIds.has(p.id);
            const isMe = p.id === me?.id;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {pending && <WarnIcon />}
                    <span className="truncate font-medium">{p.nick}</span>
                    {p.is_admin && (
                      <span className="text-xs text-amber-400">{t.admin}</span>
                    )}
                    {p.disabled && (
                      <span className="rounded bg-rose-500/20 px-1.5 text-xs text-rose-300">
                        {t.disabled}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-neutral-400">
                    {t.reviews}: {reviewCounts.get(p.id) ?? 0}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {t.invitedBy}:{" "}
                  {p.invited_by
                    ? (nickById.get(p.invited_by) ?? t.unknown)
                    : "-"}{" "}
                  · {t.created}: {fmt(p.created_at)}
                </p>
                {links[p.id] && <CopyLink url={links[p.id]} />}
                <div className="flex flex-wrap gap-2">
                  {pending && (
                    <button
                      type="button"
                      disabled={resolve.isPending}
                      onClick={() => onResolve(p.id)}
                      className={`${btn} bg-amber-400 font-medium text-neutral-950 disabled:opacity-50`}
                    >
                      {t.resolve}
                    </button>
                  )}
                  {!isMe && !p.is_admin && (
                    <>
                      <button
                        type="button"
                        disabled={userAction.isPending}
                        onClick={() =>
                          onUserAction(p, p.disabled ? "unban" : "ban")
                        }
                        className={`${btn} bg-neutral-800 text-neutral-200 disabled:opacity-50`}
                      >
                        {p.disabled ? t.unban : t.ban}
                      </button>
                      <button
                        type="button"
                        disabled={userAction.isPending}
                        onClick={() => onUserAction(p, "delete")}
                        className={`${btn} bg-rose-500/20 text-rose-300 disabled:opacity-50`}
                      >
                        {t.delete}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-neutral-400">{t.unmatched}</h2>
        {unmatched.length === 0 ? (
          <p className="text-neutral-500">{t.noUnmatched}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unmatched.map((r: ResetRequest) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-xl bg-neutral-900 p-4 text-sm"
              >
                <p>
                  <span className="text-neutral-400">{t.requestNick}:</span>{" "}
                  {r.nick}
                </p>
                <p>
                  <span className="text-neutral-400">{t.requestInviter}:</span>{" "}
                  {r.inviter_nick}
                </p>
                <p>
                  <span className="text-neutral-400">{t.inviterMatches}:</span>{" "}
                  {r.inviter_matches ? t.yes : t.no}
                </p>
                <p className="text-xs text-neutral-500">{fmt(r.created_at)}</p>
                <button
                  type="button"
                  disabled={dismiss.isPending}
                  onClick={() => dismiss.mutate(r.id, { onError: reportError })}
                  className={`${btn} self-start bg-neutral-800 text-neutral-200 disabled:opacity-50`}
                >
                  {t.dismiss}
                </button>
              </li>
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
