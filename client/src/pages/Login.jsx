import React, { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from '../api';

export default function Login({ onLogin }) {
  // 'loading' | 'passkey' | 'setup'
  const [mode, setMode] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Setup form state
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');

  useEffect(() => {
    api.get('/auth/passkey/has-passkeys').then((r) => {
      setMode(r.data.count > 0 ? 'passkey' : 'setup');
    });
  }, []);

  // ── Sign in with passkey ─────────────────────────────────────
  const handlePasskeyLogin = async () => {
    setError('');
    setBusy(true);
    try {
      const optRes = await api.post('/auth/passkey/login/options');
      const { options, challengeToken } = optRes.data;
      const credential = await startAuthentication({ optionsJSON: options });
      await api.post('/auth/passkey/login/verify', { credential, challengeToken });
      onLogin();
    } catch (err) {
      setError(err?.response?.data?.error || 'Authentication failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Register a new passkey (requires APP_PASSWORD) ───────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password required'); return; }
    setError('');
    setBusy(true);
    try {
      const optRes = await api.post('/auth/passkey/register/options', { password });
      const { options, challengeToken } = optRes.data;
      const credential = await startRegistration({ optionsJSON: options });
      await api.post('/auth/passkey/register/verify', {
        credential,
        deviceName: deviceName.trim() || 'My device',
        challengeToken,
      });
      // Registration succeeded — now log in
      const loginOptRes = await api.post('/auth/passkey/login/options');
      const { options: loginOptions, challengeToken: loginChallengeToken } = loginOptRes.data;
      const authCredential = await startAuthentication({ optionsJSON: loginOptions });
      await api.post('/auth/passkey/login/verify', { credential: authCredential, challengeToken: loginChallengeToken });
      onLogin();
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'loading') {
    return (
      <div className="login-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Bill Tracker</h1>

        {mode === 'passkey' && (
          <>
            <button
              className="btn btn-primary btn-full passkey-btn"
              onClick={handlePasskeyLogin}
              disabled={busy}
            >
              {busy ? 'Authenticating…' : (
                <>
                  <PasskeyIcon />
                  Sign in with Passkey
                </>
              )}
            </button>
            {error && <p className="login-error">{error}</p>}
            <p className="login-hint">
              Uses Face ID, Touch ID, or your device PIN.
            </p>
            <button
              className="login-secondary-link"
              onClick={() => { setMode('setup'); setError(''); }}
            >
              Register a new device
            </button>
          </>
        )}

        {mode === 'setup' && (
          <>
            <p className="login-setup-hint">
              {/* Show different message for first time vs adding a device */}
              Enter your app password to register this device with a passkey.
            </p>
            <form onSubmit={handleRegister} style={{ display: 'contents' }}>
              <input
                type="text"
                placeholder="Device name (e.g. iPhone 15)"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                autoComplete="off"
              />
              <input
                type="password"
                placeholder="App password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              {error && <p className="login-error">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary btn-full passkey-btn"
                disabled={busy}
              >
                {busy ? 'Setting up…' : (
                  <>
                    <PasskeyIcon />
                    Register Passkey
                  </>
                )}
              </button>
            </form>
            <button
              className="login-secondary-link"
              onClick={() => { setMode('passkey'); setError(''); }}
            >
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PasskeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="4" />
      <path d="M14 8h2a2 2 0 0 1 2 2v1" />
      <path d="M18 11v6" />
      <path d="M15 14h6" />
      <path d="M2 20s1-2 6-2 6 2 6 2" />
    </svg>
  );
}
