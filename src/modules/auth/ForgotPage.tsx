import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { callApi } from "#shared/api/callApi.js";
import { AuthShell } from "./AuthShell.js";
import { authStrings } from "./strings.js";
import { Button, buttonClass } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { PageTitle } from "#shared/ui/Status.js";

export function ForgotPage() {
  const [nick, setNick] = useState("");
  const [inviterNick, setInviterNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const s = authStrings.forgot;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Always the same confirmation, whatever the server says: no account enumeration.
    await callApi("/api/reset-request", {
      nick: nick.trim(),
      inviterNick: inviterNick.trim(),
    });
    setBusy(false);
    setDone(true);
  }

  return (
    <AuthShell>
      <PageTitle className="text-2xl">{s.title}</PageTitle>
      {done ? (
        <p className="text-neutral-200">{s.done}</p>
      ) : (
        <>
          <p className="text-sm text-neutral-400">{s.hint}</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              placeholder={s.nick}
              aria-label={s.nick}
              autoCapitalize="none"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <Input
              placeholder={s.inviterNick}
              aria-label={s.inviterNick}
              autoCapitalize="none"
              value={inviterNick}
              onChange={(e) => setInviterNick(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy || !nick.trim() || !inviterNick.trim()}
            >
              {busy ? s.submitting : s.submit}
            </Button>
          </form>
        </>
      )}
      <Link to="/login" className={buttonClass({ variant: "link" })}>
        {s.back}
      </Link>
    </AuthShell>
  );
}
