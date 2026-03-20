import { useState, useEffect, createContext, useContext } from 'react';
import { AuthBar, EcosystemNav } from 'vegvisr-ui-kit';
import { readStoredUser, type AuthUser } from './lib/auth';

const MAGIC_BASE     = 'https://cookie.vegvisr.org';
const DASHBOARD_BASE = 'https://dashboard.vegvisr.org';

// ─── Auth Context ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthUser | null>(null);
export const useAuth = () => useContext(AuthContext);

// ─── AuthGate ─────────────────────────────────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser]     = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authed' | 'anonymous'>('checking');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStatus, setLoginStatus] = useState('');
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const setAuthCookie = (token: string) => {
    if (!token) return;
    const isVegvisr = window.location.hostname.endsWith('vegvisr.org');
    const domain    = isVegvisr ? '; Domain=.vegvisr.org' : '';
    const maxAge    = 60 * 60 * 24 * 30;
    document.cookie = `vegvisr_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure${domain}`;
  };

  const persistUser = (user: {
    email: string; role: string;
    user_id: string | null; emailVerificationToken: string | null; oauth_id?: string | null;
  }) => {
    const payload = {
      email: user.email,
      role: user.role,
      user_id: user.user_id,
      oauth_id: user.oauth_id || user.user_id || null,
      emailVerificationToken: user.emailVerificationToken,
    };
    localStorage.setItem('user', JSON.stringify(payload));
    if (user.emailVerificationToken) setAuthCookie(user.emailVerificationToken);
    sessionStorage.setItem('email_session_verified', '1');
    setAuthUser({
      userId: payload.user_id || payload.oauth_id || '',
      email: payload.email,
      role: payload.role || null,
    });
  };

  const fetchUserContext = async (email: string) => {
    const roleRes = await fetch(`${DASHBOARD_BASE}/get-role?email=${encodeURIComponent(email)}`);
    if (!roleRes.ok) throw new Error('Unable to retrieve user role.');
    const roleData = await roleRes.json();
    if (!roleData?.role) throw new Error('Unable to retrieve user role.');
    const userDataRes = await fetch(`${DASHBOARD_BASE}/userdata?email=${encodeURIComponent(email)}`);
    if (!userDataRes.ok) throw new Error('Unable to fetch user data.');
    const userData = await userDataRes.json();
    return { email, role: roleData.role, user_id: userData.user_id, emailVerificationToken: userData.emailVerificationToken, oauth_id: userData.oauth_id };
  };

  const verifyMagicToken = async (token: string) => {
    const res  = await fetch(`${MAGIC_BASE}/login/magic/verify?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok || !data.success || !data.email) throw new Error(data.error || 'Invalid or expired magic link.');
    try {
      const ctx = await fetchUserContext(data.email);
      persistUser(ctx);
    } catch {
      persistUser({ email: data.email, role: 'user', user_id: data.email, emailVerificationToken: null });
    }
  };

  const sendMagicLink = async () => {
    if (!loginEmail.trim()) return;
    setLoginError('');
    setLoginStatus('');
    setLoginLoading(true);
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      const res  = await fetch(`${MAGIC_BASE}/login/magic/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), redirectUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send magic link.');
      setLoginStatus('Magic link sent — check your email.');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to send magic link.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem('user'); sessionStorage.removeItem('email_session_verified'); } catch {}
    const base = 'vegvisr_token=; Path=/; Max-Age=0; SameSite=Lax; Secure';
    document.cookie = base;
    if (window.location.hostname.endsWith('vegvisr.org')) document.cookie = `${base}; Domain=.vegvisr.org`;
    setAuthUser(null);
    setAuthStatus('anonymous');
  };

  // Check magic link on load
  useEffect(() => {
    const url   = new URL(window.location.href);
    const magic = url.searchParams.get('magic');
    if (magic) {
      setAuthStatus('checking');
      verifyMagicToken(magic)
        .then(() => {
          url.searchParams.delete('magic');
          window.history.replaceState({}, '', url.toString());
          setAuthStatus('authed');
        })
        .catch(() => setAuthStatus('anonymous'));
      return;
    }
    const stored = readStoredUser();
    if (stored) { setAuthUser(stored); setAuthStatus('authed'); }
    else         { setAuthStatus('anonymous'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Authed layout ──
  if (authStatus === 'authed') {
    return (
      <AuthContext.Provider value={authUser}>
        <div className="flex flex-col h-screen">
          <EcosystemNav className="flex-shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-2" />
          {children}
        </div>
      </AuthContext.Provider>
    );
  }

  // ── Login screen ──
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.2),_transparent_55%)] pointer-events-none" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Knowledge Editor</h1>
            <p className="text-slate-400 text-sm">Sign in to start editing</p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
            </div>

            {loginError  && <p className="text-red-400 text-sm">{loginError}</p>}
            {loginStatus && <p className="text-emerald-400 text-sm">{loginStatus}</p>}

            <button
              type="button"
              onClick={sendMagicLink}
              disabled={loginLoading || !loginEmail.trim()}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl transition"
            >
              {loginLoading ? 'Sending…' : 'Send magic link'}
            </button>
          </div>

          {authStatus === 'checking' && (
            <p className="text-center text-slate-500 text-sm mt-4">Checking session…</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App (placeholder for editor content) ────────────────────────────

function KnowledgeEditorApp() {
  const auth = useAuth();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-semibold text-slate-900">Knowledge Editor</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{auth?.email}</span>
          <AuthBar />
        </div>
      </header>

      {/* Editor placeholder */}
      <main className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700 mb-2">Welcome, {auth?.email?.split('@')[0]}</p>
          <p className="text-slate-400">Knowledge editor coming soon…</p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <KnowledgeEditorApp />
    </AuthGate>
  );
}
