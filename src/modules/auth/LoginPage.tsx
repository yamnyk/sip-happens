import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthShell } from "./AuthShell.js";
import { useSession } from "./session.js";
import { authStrings } from "./strings.js";
import { Button, buttonClass } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { ErrorText, PageTitle } from "#shared/ui/Status.js";

export function LoginPage() {
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
    <AuthShell>
      <PageTitle className="text-2xl">{s.title}</PageTitle>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          placeholder={s.nick}
          aria-label={s.nick}
          autoComplete="username"
          autoCapitalize="none"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />
        <Input
          type="password"
          placeholder={s.password}
          aria-label={s.password}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {failed && <ErrorText>{s.failed}</ErrorText>}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={busy || !nick.trim() || !password}
        >
          {busy ? s.submitting : s.submit}
        </Button>
      </form>
      <Link to="/forgot" className={buttonClass({ variant: "link" })}>
        {s.forgot}
      </Link>
    </AuthShell>
  );
}
