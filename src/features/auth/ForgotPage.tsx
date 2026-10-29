import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { callApi } from "./api";
import { authStrings } from "./strings";
import { inputCls, linkCls, primaryBtnCls } from "./ui";

export default function ForgotPage() {
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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
      {done ? (
        <p className="text-neutral-200">{s.done}</p>
      ) : (
        <>
          <p className="text-sm text-neutral-400">{s.hint}</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              className={inputCls}
              placeholder={s.nick}
              aria-label={s.nick}
              autoCapitalize="none"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder={s.inviterNick}
              aria-label={s.inviterNick}
              autoCapitalize="none"
              value={inviterNick}
              onChange={(e) => setInviterNick(e.target.value)}
            />
            <button
              type="submit"
              className={primaryBtnCls}
              disabled={busy || !nick.trim() || !inviterNick.trim()}
            >
              {busy ? s.submitting : s.submit}
            </button>
          </form>
        </>
      )}
      <Link to="/login" className={linkCls}>
        {s.back}
      </Link>
    </div>
  );
}
