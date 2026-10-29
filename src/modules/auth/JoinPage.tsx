import { Link, useParams } from "react-router";
import { AuthShell } from "./AuthShell.js";
import { authStrings } from "./strings.js";
import { useInviteStatus } from "./useInviteStatus.js";
import { useRegister } from "./useRegister.js";
import { apiErrors } from "#shared/strings.js";
import { Button, buttonClass } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { ErrorText, PageTitle } from "#shared/ui/Status.js";

export function JoinPage() {
  const { token = "" } = useParams();
  const { status, setStatus } = useInviteStatus(token);
  const { nick, setNick, password, setPassword, busy, error, onSubmit } =
    useRegister(token, () =>
      setStatus({ state: "dead", message: apiErrors.invalid_token }),
    );
  const s = authStrings.join;

  return (
    <AuthShell>
      {status.state === "loading" && (
        <p className="text-neutral-400">{s.loading}</p>
      )}
      {status.state === "dead" && (
        <>
          <p className="text-neutral-200">{status.message}</p>
          <Link to="/login" className={buttonClass({ variant: "link" })}>
            {s.toLogin}
          </Link>
        </>
      )}
      {status.state === "valid" && (
        <>
          <PageTitle className="text-2xl">{s.title}</PageTitle>
          {status.inviterNick && (
            <p className="text-amber-400">{s.invitedBy(status.inviterNick)}</p>
          )}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <ErrorText>{error}</ErrorText>}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy || !nick || !password}
            >
              {busy ? s.submitting : s.submit}
            </Button>
          </form>
          <Link to="/login" className={buttonClass({ variant: "link" })}>
            {s.toLogin}
          </Link>
        </>
      )}
    </AuthShell>
  );
}
