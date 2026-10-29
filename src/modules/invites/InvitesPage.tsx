import { useState } from "react";
import { useSession } from "#modules/auth/index.js";
import { useProfiles } from "#shared/api/queries.js";
import { strings } from "#shared/strings.js";
import { Button } from "#shared/ui/Button.js";
import { ErrorText, PageTitle } from "#shared/ui/Status.js";
import { InviteListItem } from "./InviteListItem.js";
import { inviteState } from "./inviteState.js";
import { NewLinkCard } from "./NewLinkCard.js";
import { useCreateInvite, useInviteLinks } from "./queries.js";
import { inviteStrings as s } from "./strings.js";
import { useCopy } from "./useCopy.js";

const inviteUrl = (token: string) => `${location.origin}/join/${token}`;

/** Invites screen: create a link and list own links with their state. */
export function InvitesPage() {
  const { profile } = useSession();
  const profiles = useProfiles();
  const [fresh, setFresh] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const { copied, copyError, copy } = useCopy();
  const myId = profile?.id;

  const links = useInviteLinks(myId);
  const create = useCreateInvite(myId, setFresh);

  const nickOf = (id: string | null) =>
    profiles.data?.find((p) => p.id === id)?.nick ?? s.usedUnknown;

  return (
    <div className="flex flex-col gap-5 py-2">
      <PageTitle>{s.title}</PageTitle>

      <Button
        variant="primary"
        onClick={() => create.mutate()}
        disabled={create.isPending}
      >
        {create.isPending ? s.creating : s.create}
      </Button>
      {create.isError && <ErrorText>{s.createFailed}</ErrorText>}

      {fresh && (
        <NewLinkCard
          url={inviteUrl(fresh)}
          copied={copied === fresh}
          copyError={copyError}
          onCopy={() => void copy(fresh, inviteUrl(fresh))}
        />
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          {s.mine}
        </h2>
        {links.isLoading && (
          <p className="text-neutral-400">{strings.common.loading}</p>
        )}
        {links.isError && <ErrorText>{s.loadFailed}</ErrorText>}
        {links.data?.length === 0 && (
          <p className="text-neutral-500">{s.none}</p>
        )}
        <ul className="flex flex-col gap-2">
          {links.data?.map((l) => (
            <InviteListItem
              key={l.token}
              link={l}
              state={inviteState(l, now, nickOf)}
              copied={copied === l.token}
              onCopy={() => void copy(l.token, inviteUrl(l.token))}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
