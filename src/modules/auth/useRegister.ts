import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { validateNick } from "#contract/nick.js";
import { checkPassword } from "#contract/schemas.js";
import { callApi } from "#shared/api/callApi.js";
import { apiErrors, nickErrors } from "#shared/strings.js";
import { authStrings } from "./strings.js";
import { useSession } from "./session.js";

/**
 * Submit flow of the join form: validate, register, sign in, go home.
 * `onInvalidToken` is called when the server rejects the invite token.
 */
export function useRegister(token: string, onInvalidToken: () => void) {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = authStrings.join;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nickErr = validateNick(nick);
    if (nickErr) return setError(nickErrors[nickErr]);
    const passwordErr = checkPassword(password);
    if (passwordErr)
      return setError(
        passwordErr === "password_too_short" ? s.passwordShort : s.passwordLong,
      );
    setBusy(true);
    setError(null);
    const res = await callApi("/api/register", { token, nick, password });
    if (!res.ok) {
      setBusy(false);
      if (res.error === "invalid_token") onInvalidToken();
      else setError(apiErrors[res.error]);
      return;
    }
    try {
      await signIn(nick, password);
      navigate("/", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  }

  return { nick, setNick, password, setPassword, busy, error, onSubmit };
}
