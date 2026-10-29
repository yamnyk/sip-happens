import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { apiErrors } from "#shared/strings.js";
import { checkPassword } from "#contract/schemas.js";
import { callApi } from "#shared/api/callApi.js";
import { AuthShell } from "./AuthShell.js";
import { authStrings } from "./strings.js";
import { Button, buttonClass } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { ErrorText, PageTitle } from "#shared/ui/Status.js";

export function ResetPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dead, setDead] = useState(false);
  const s = authStrings.reset;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const passwordErr = checkPassword(password);
    if (passwordErr)
      return setError(
        passwordErr === "password_too_short"
          ? authStrings.join.passwordShort
          : authStrings.join.passwordLong,
      );
    setBusy(true);
    setError(null);
    const res = await callApi("/api/reset-complete", { token, password });
    setBusy(false);
    if (res.ok) return navigate("/login", { replace: true });
    if (res.error === "invalid_token") setDead(true);
    else setError(apiErrors[res.error]);
  }

  return (
    <AuthShell>
      {dead ? (
        <>
          <p className="text-neutral-200">{apiErrors.invalid_token}</p>
          <Link to="/login" className={buttonClass({ variant: "link" })}>
            {authStrings.forgot.back}
          </Link>
        </>
      ) : (
        <>
          <PageTitle className="text-2xl">{s.title}</PageTitle>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
              disabled={busy || !password}
            >
              {busy ? s.submitting : s.submit}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
