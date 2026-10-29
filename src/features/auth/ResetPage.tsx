import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { apiErrors } from '../../strings';
import { checkPassword } from '../../lib/schemas';
import { callApi } from './api';
import { authStrings } from './strings';
import { errCls, inputCls, linkCls, primaryBtnCls } from './ui';

export default function ResetPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dead, setDead] = useState(false);
  const s = authStrings.reset;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const passwordErr = checkPassword(password);
    if (passwordErr) return setError(passwordErr === 'password_too_short' ? authStrings.join.passwordShort : authStrings.join.passwordLong);
    setBusy(true);
    setError(null);
    const res = await callApi('/api/reset-complete', { token, password });
    setBusy(false);
    if (res.ok) return navigate('/login', { replace: true });
    if (res.error === 'invalid_token') setDead(true);
    else setError(apiErrors[res.error]);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      {dead ? (
        <>
          <p className="text-neutral-200">{apiErrors.invalid_token}</p>
          <Link to="/login" className={linkCls}>
            {authStrings.forgot.back}
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{s.title}</h1>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
            <button type="submit" className={primaryBtnCls} disabled={busy || !password}>
              {busy ? s.submitting : s.submit}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
