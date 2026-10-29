import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useSession } from "../../app/session";
import { authStrings } from "./strings";
import { errCls, inputCls, linkCls, primaryBtnCls } from "./ui";

export default function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const s = authStrings.login;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      await signIn(nick.trim(), password);
      navigate("/", { replace: true });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          className={inputCls}
          placeholder={s.nick}
          aria-label={s.nick}
          autoComplete="username"
          autoCapitalize="none"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />
        <input
          className={inputCls}
          type="password"
          placeholder={s.password}
          aria-label={s.password}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {failed && <p className={errCls}>{s.failed}</p>}
        <button
          type="submit"
          className={primaryBtnCls}
          disabled={busy || !nick.trim() || !password}
        >
          {busy ? s.submitting : s.submit}
        </button>
      </form>
      <Link to="/forgot" className={linkCls}>
        {s.forgot}
      </Link>
    </div>
  );
}
