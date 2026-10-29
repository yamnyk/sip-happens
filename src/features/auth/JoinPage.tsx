import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useSession } from '../../app/session';
import { validateNick } from '../../lib/nick';
import { apiErrors, nickErrors } from '../../strings';
import { checkPassword } from '../../lib/schemas';
import { callApi } from './api';
import { authStrings } from './strings';
import { errCls, inputCls, linkCls, primaryBtnCls } from './ui';

type Status = { state: 'loading' } | { state: 'dead'; message: string } | { state: 'valid'; inviterNick: string };

export default function JoinPage() {
  const { token = '' } = useParams();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ state: 'loading' });
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = authStrings.join;

  useEffect(() => {
    let cancelled = false;
    void callApi<{ valid: boolean; inviterNick?: string }>(
      `/api/invite-status?token=${encodeURIComponent(token)}`,
    ).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setStatus({ state: 'dead', message: apiErrors[res.error === 'server_error' ? 'server_error' : 'invalid_token'] });
      } else if (!res.valid) {
        setStatus({ state: 'dead', message: apiErrors.invalid_token });
      } else {
        setStatus({ state: 'valid', inviterNick: res.inviterNick ?? '' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nickErr = validateNick(nick);
    if (nickErr) return setError(nickErrors[nickErr]);
    const passwordErr = checkPassword(password);
    if (passwordErr) return setError(passwordErr === 'password_too_short' ? s.passwordShort : s.passwordLong);
    setBusy(true);
    setError(null);
    const res = await callApi('/api/register', { token, nick, password });
    if (!res.ok) {
      setBusy(false);
      if (res.error === 'invalid_token') setStatus({ state: 'dead', message: apiErrors.invalid_token });
      else setError(apiErrors[res.error]);
      return;
    }
    try {
      await signIn(nick, password);
      navigate('/', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      {status.state === 'loading' && <p className="text-neutral-400">...</p>}
      {status.state === 'dead' && (
        <>
          <p className="text-neutral-200">{status.message}</p>
          <Link to="/login" className={linkCls}>
            {s.toLogin}
          </Link>
        </>
      )}
      {status.state === 'valid' && (
        <>
          <h1 className="text-2xl font-semibold">{s.title}</h1>
          {status.inviterNick && <p className="text-amber-400">{s.invitedBy(status.inviterNick)}</p>}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className={errCls}>{error}</p>}
            <button type="submit" className={primaryBtnCls} disabled={busy || !nick || !password}>
              {busy ? s.submitting : s.submit}
            </button>
          </form>
          <Link to="/login" className={linkCls}>
            {s.toLogin}
          </Link>
        </>
      )}
    </div>
  );
}
