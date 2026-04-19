import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { LegalDocumentDialog, type LegalDocument } from '../components/LegalDocumentDialog';
import { LogoBlock } from '../components/Logo';
import { aesEncrypt } from '../crypto/aes';
import { DEFAULT_ARGON2_PARAMS, deriveMasterAesKey, deriveMasterKey, deriveAuthToken } from '../crypto/kdf';
import { generateUserKeyPairs } from '../crypto/kem';
import { randomBytes, toBase64 } from '../crypto/utils';
import { isTauri } from '../storage';
import { useAuthStore } from '../store/auth';
import { useModeStore } from '../store/mode';
import { getTurnstileSiteKey, isHostedWebLogin, loadTurnstileScript } from '../turnstile';
import type { SessionKeys } from '../types';

function validateUsername(value: string) {
  if (!value) {
    return 'Username is required';
  }
  if (value.length < 3) {
    return 'Username must be at least 3 characters';
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    return 'Username may use letters, numbers, dots, dashes, and underscores only';
  }
  return '';
}

function toFriendlyAuthError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Registration failed';
  if (message.toLowerCase().includes('verification token is required')) {
    return 'Verification is required for hosted registration. Complete the challenge again and retry.';
  }
  if (message.toLowerCase().includes('verification failed')) {
    return 'Verification expired or could not be validated. Retry the challenge and submit again.';
  }
  return message;
}

function getSafeRedirectPath(searchParams: URLSearchParams, fallback = '/vaults') {
  const next = searchParams.get('next')?.trim();
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }

  return next;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, setSessionKeys } = useAuthStore();
  const setMode = useModeStore((s) => s.setMode);
  const isDesktop = isTauri();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [legalDocumentOpen, setLegalDocumentOpen] = useState<LegalDocument | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileMessage, setTurnstileMessage] = useState('');
  const [turnstileContainer, setTurnstileContainer] = useState<HTMLDivElement | null>(null);
  const [turnstileRenderKey, setTurnstileRenderKey] = useState(0);
  const [turnstileStatus, setTurnstileStatus] = useState<'idle' | 'loading' | 'ready' | 'verified' | 'error'>('idle');
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = useMemo(() => getTurnstileSiteKey(), []);
  const turnstileEnabled = isHostedWebLogin() && Boolean(turnstileSiteKey);
  const postAuthRedirect = useMemo(() => getSafeRedirectPath(searchParams), [searchParams]);

  useEffect(() => {
    if (!turnstileEnabled) {
      setTurnstileStatus('idle');
      return;
    }
    if (!turnstileToken) {
      setTurnstileStatus('loading');
    }
  }, [turnstileEnabled, turnstileToken]);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileContainer) {
      return;
    }

    let cancelled = false;
    setTurnstileStatus('loading');

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileContainer) {
          return;
        }

        const existingWidgetId = turnstileWidgetIdRef.current;
        if (existingWidgetId && window.turnstile.remove) {
          window.turnstile.remove(existingWidgetId);
          turnstileWidgetIdRef.current = null;
        }

        const widgetId = window.turnstile.render(turnstileContainer, {
          sitekey: turnstileSiteKey,
          theme: 'auto',
          appearance: 'always',
          retry: 'auto',
          'refresh-expired': 'auto',
          callback: (token) => {
            setTurnstileToken(token);
            setTurnstileMessage('Verification complete.');
            setTurnstileStatus('verified');
            setError('');
          },
          'expired-callback': () => {
            setTurnstileToken('');
            setTurnstileMessage('Verification expired. Please retry.');
            setTurnstileStatus('ready');
          },
          'error-callback': () => {
            setTurnstileToken('');
            setTurnstileMessage('Verification failed in this browser session. Retry the challenge. If strict tracking protection is enabled, allow this site and reload.');
            setTurnstileStatus('error');
            setError('Verification failed. Please try again.');
          },
          'timeout-callback': () => {
            setTurnstileToken('');
            setTurnstileMessage('Verification timed out. Retry the challenge and submit again.');
            setTurnstileStatus('ready');
          },
          'unsupported-callback': () => {
            setTurnstileToken('');
            setTurnstileMessage('This browser blocked the verification challenge. Relax strict tracking protection for this site and retry.');
            setTurnstileStatus('error');
          },
        });

        turnstileWidgetIdRef.current = widgetId;
        setTurnstileStatus('ready');
        setTurnstileMessage((current) => current || 'Complete the verification to continue.');
      })
      .catch((err) => {
        if (!cancelled) {
          setTurnstileStatus('error');
          setTurnstileMessage('Verification challenge could not be loaded. Retry the challenge. If the browser is using strict tracking prevention, allow this site and reload.');
          setError(err instanceof Error ? err.message : 'Failed to load verification challenge.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [turnstileContainer, turnstileEnabled, turnstileRenderKey, turnstileSiteKey]);

  useEffect(() => () => {
    const widgetId = turnstileWidgetIdRef.current;
    if (widgetId && window.turnstile?.remove) {
      window.turnstile.remove(widgetId);
    }
  }, []);

  const resetTurnstile = (message = 'Verification reset. Complete the challenge again.') => {
    setTurnstileToken('');
    const widgetId = turnstileWidgetIdRef.current;
    if (widgetId && window.turnstile?.remove) {
      window.turnstile.remove(widgetId);
    }
    turnstileWidgetIdRef.current = null;
    setTurnstileStatus(turnstileEnabled ? 'loading' : 'idle');
    setTurnstileMessage(message);
    setTurnstileRenderKey((value) => value + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedUsername = username.trim();
    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!password || !confirm) {
      setError('Password and confirmation are required');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the Terms of Service before creating an account');
      return;
    }
    if (turnstileEnabled && !turnstileToken) {
      if (turnstileStatus === 'loading') {
        setError('Verification is still loading. Wait a moment or retry the challenge.');
      } else if (turnstileStatus === 'error') {
        setError('Verification is blocked in this browser session. Retry the challenge. If strict tracking prevention is enabled, allow this site and reload.');
      } else {
        setError('Please complete the verification check before creating an account.');
      }
      return;
    }

    setLoading(true);
    try {
      // 1. Generate random Argon2 salt
      const salt = randomBytes(16);
      const saltB64 = toBase64(salt);

      // 2. Derive master key (Argon2id — takes a few seconds intentionally)
      const masterKey = await deriveMasterKey(password, saltB64, DEFAULT_ARGON2_PARAMS);

      // 3. Derive auth_token — this is what the server stores (hashed)
      const authToken = deriveAuthToken(masterKey);

      // 4. Generate X25519 + ML-KEM-768 keypairs
      const { classical, pq } = generateUserKeyPairs();

      // 5. Encrypt private keys with masterKey before sending to server
      const masterAesKey = await deriveMasterAesKey(masterKey);
      const classPrivEnc = await aesEncrypt(masterAesKey, classical.privateKey);
      const pqPrivEnc = await aesEncrypt(masterAesKey, pq.secretKey);

      // 6. Register
      await authApi.register({
        username: normalizedUsername,
        auth_token: authToken,
        argon2_salt: saltB64,
        argon2_params: DEFAULT_ARGON2_PARAMS,
        classical_public_key: toBase64(classical.publicKey),
        pq_public_key: toBase64(pq.publicKey),
        classical_priv_encrypted: toBase64(classPrivEnc),
        pq_priv_encrypted: toBase64(pqPrivEnc),
        turnstile_token: turnstileToken || undefined,
      });

      if (turnstileEnabled) {
        const nextParams = new URLSearchParams();
        nextParams.set('registered', '1');
        nextParams.set('username', normalizedUsername);
        if (postAuthRedirect !== '/vaults') {
          nextParams.set('next', postAuthRedirect);
        }
        navigate(`/login?${nextParams.toString()}`, { replace: true });
        return;
      }

      const loginResp = await authApi.login(normalizedUsername, authToken);

      const keys: SessionKeys = {
        masterKey,
        classicalPrivKey: classical.privateKey,
        classicalPubKey: classical.publicKey,
        pqPrivKey: pq.secretKey,
        pqPubKey: pq.publicKey,
      };

      setTokens(loginResp.access_token, loginResp.refresh_token, normalizedUsername);
      setSessionKeys(keys);
      navigate(postAuthRedirect, { replace: true });
    } catch (err) {
      if (turnstileEnabled) {
        resetTurnstile();
      }
      setError(toFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <LogoBlock className="mb-8" />

        {/* Card */}
        <div className="rounded-2xl border border-slate-700 bg-surface-1 p-8 shadow-xl">
          <h2 className="mb-1 text-lg font-semibold text-white">Create account</h2>
          <p className="mb-6 text-xs text-slate-500">
            Your password derives the encryption key — it never leaves your device.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-slate-600 bg-surface px-4 py-2.5 text-white placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 12 characters"
                autoComplete="new-password"
                required
                minLength={12}
                className="w-full rounded-lg border border-slate-600 bg-surface px-4 py-2.5 text-white placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-slate-600 bg-surface px-4 py-2.5 text-white placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {turnstileEnabled && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Verification</label>
                <div key={turnstileRenderKey} ref={setTurnstileContainer} className="min-h-[65px] overflow-hidden rounded-lg border border-slate-600 bg-surface px-2 py-2" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p>This extra check helps block automated account creation abuse on the hosted app. If the challenge never completes in a strict privacy mode, allow this site and retry.</p>
                  <button
                    type="button"
                    onClick={() => resetTurnstile()}
                    className="text-accent hover:underline"
                  >
                    Reload verification
                  </button>
                </div>
                {turnstileMessage && <p className="mt-2 text-xs text-slate-400">{turnstileMessage}</p>}
              </div>
            )}

            <label className="flex items-start gap-3 rounded-lg border border-slate-700 bg-surface px-3 py-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-500 bg-surface text-accent focus:ring-accent"
              />
              <span className="leading-6">
                I agree to the{' '}
                <button type="button" onClick={() => setLegalDocumentOpen('terms')} className="text-accent hover:underline">
                  Terms of Service
                </button>
                {' '}and acknowledge the{' '}
                <button type="button" onClick={() => setLegalDocumentOpen('privacy')} className="text-accent hover:underline">
                  Privacy & GDPR Notice
                </button>
                .
              </span>
            </label>

            {error && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password || !confirm || !acceptedTerms}
              className="w-full rounded-lg bg-accent py-2.5 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating keys…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-accent hover:underline">
            Sign in
          </Link>
        </p>

        {isDesktop && (
          <p className="mt-2 text-center text-xs text-slate-500">
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => {
                setMode('local');
                navigate('/local-unlock');
              }}
            >
              Set up offline mode instead
            </button>
          </p>
        )}
      </div>

      <LegalDocumentDialog document={legalDocumentOpen} onClose={() => setLegalDocumentOpen(null)} />
    </div>
  );
}
