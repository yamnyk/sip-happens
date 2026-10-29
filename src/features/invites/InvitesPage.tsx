import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../app/session";
import { useProfiles } from "../../data/queries";
import { supabase } from "../../lib/supabase";
import { strings } from "../../strings";
import type { InviteLink } from "../../types/domain";
import { inviteStrings as s } from "./strings";

const linksKey = (userId: string | undefined) => ["links", userId] as const;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const inviteUrl = (token: string) => `${location.origin}/join/${token}`;

export default function InvitesPage() {
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const profiles = useProfiles();
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [now] = useState(() => Date.now());
  const myId = profile?.id;

  const links = useQuery({
    queryKey: linksKey(myId),
    enabled: Boolean(myId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("kind", "invite")
        .eq("created_by", myId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InviteLink[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .insert({ kind: "invite" })
        .select("token")
        .single();
      if (error) throw error;
      return (data as { token: string }).token;
    },
    onSuccess: (token) => {
      setFresh(token);
      void queryClient.invalidateQueries({ queryKey: linksKey(myId) });
    },
  });

  async function copy(token: string) {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
    } catch {
      setCopyError(true);
    }
  }

  const nickOf = (id: string | null) =>
    profiles.data?.find((p) => p.id === id)?.nick ?? s.usedUnknown;

  function stateText(l: InviteLink): { text: string; tone: string } {
    if (l.used_at)
      return {
        text: s.used(nickOf(l.used_by), fmt(l.used_at)),
        tone: "text-emerald-400",
      };
    if (new Date(l.expires_at).getTime() <= now)
      return { text: s.expired(fmt(l.expires_at)), tone: "text-neutral-500" };
    return { text: s.active(fmt(l.expires_at)), tone: "text-amber-400" };
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold">{s.title}</h1>

      <button
        type="button"
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="min-h-11 rounded-lg bg-amber-400 px-4 font-semibold text-neutral-950 disabled:opacity-50"
      >
        {create.isPending ? s.creating : s.create}
      </button>
      {create.isError && (
        <p className="text-sm text-red-400">{s.createFailed}</p>
      )}

      {fresh && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-400/50 bg-neutral-900 p-3">
          <p className="text-sm text-neutral-400">{s.newLink}</p>
          <input
            readOnly
            value={inviteUrl(fresh)}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
          />
          <button
            type="button"
            onClick={() => void copy(fresh)}
            className="min-h-11 rounded-lg border border-amber-400 px-4 text-amber-400"
          >
            {copied === fresh ? s.copied : s.copy}
          </button>
          {copyError && <p className="text-sm text-red-400">{s.copyFailed}</p>}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          {s.mine}
        </h2>
        {links.isLoading && (
          <p className="text-neutral-400">{strings.common.loading}</p>
        )}
        {links.isError && (
          <p className="text-sm text-red-400">{s.loadFailed}</p>
        )}
        {links.data?.length === 0 && (
          <p className="text-neutral-500">{s.none}</p>
        )}
        <ul className="flex flex-col gap-2">
          {links.data?.map((l) => {
            const st = stateText(l);
            const active = !l.used_at && new Date(l.expires_at).getTime() > now;
            return (
              <li
                key={l.token}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="min-w-0">
                  <p className={`text-sm ${st.tone}`}>{st.text}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {fmt(l.created_at)}
                  </p>
                </div>
                {active && (
                  <button
                    type="button"
                    onClick={() => void copy(l.token)}
                    className="min-h-11 shrink-0 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-200"
                  >
                    {copied === l.token ? s.copied : s.copy}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
