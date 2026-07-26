/** Username-only login / sign-up. No email required. */
import { useState } from 'react';
import { useApp } from '../../lib/store.jsx';
import { Button, Input, Field, Badge } from '../../components/ui.jsx';
import { DumbbellIcon } from '../../components/Icons.jsx';
import './auth.css';

export default function LoginPage() {
  const { signIn, signUp, backend } = useApp();
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(username, password);
      else await signUp(username, password);
    } catch (err) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__glow" aria-hidden />

      <div className="auth__brand">
        <div className="auth__logo"><DumbbellIcon width={26} height={26} /></div>
        <h1 className="auth__title">Fitness</h1>
        <p className="auth__tagline">Train. Track. Progress.</p>
      </div>

      <form className="auth__card" onSubmit={submit}>
        <div className="auth__tabs">
          <button
            type="button"
            className={`auth__tab ${mode === 'signin' ? 'auth__tab--on' : ''}`}
            onClick={() => { setMode('signin'); setError(''); }}
          >Sign in</button>
          <button
            type="button"
            className={`auth__tab ${mode === 'signup' ? 'auth__tab--on' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >Create account</button>
        </div>

        <div className="stack">
          <Field label="Username" id="username">
            <Input
              id="username"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>

          <Field label="Password" id="password">
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && <p className="auth__error">{error}</p>}

          <Button type="submit" size="lg" full loading={busy}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </div>
      </form>

      <p className="auth__foot">
        <Badge tone={backend === 'supabase' ? 'success' : 'muted'}>
          {backend === 'supabase' ? 'Synced across devices' : 'Stored on this device'}
        </Badge>
      </p>
    </div>
  );
}
