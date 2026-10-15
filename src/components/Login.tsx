import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useBrand } from '../branding';

export const Login: React.FC = () => {
  const brand = useBrand();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const { login, bypassLogin, isLoading, error } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    await login(email);
    if (!error) {
      setIsSent(true);
    }
  };

  if (brand.world) {
    return (
      <WorldLogin
        brand={brand}
        email={email}
        setEmail={setEmail}
        isSent={isSent}
        setIsSent={setIsSent}
        isLoading={isLoading}
        error={error}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <img 
              src={brand.logoUrl} 
              alt={`${brand.name} logo`} 
              className="w-14 h-14 rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">Welcome Back</h1>
        <p className="text-zinc-400 text-center mb-8">
          Enter your email to receive a magic link for secure login.
        </p>

        {isSent ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-emerald-400 font-semibold mb-2">Magic link sent!</h2>
            <p className="text-emerald-400/70 text-sm">
              Check your inbox at <span className="font-medium text-emerald-400">{email}</span> and click the link to sign in.
            </p>
            <button 
              onClick={() => setIsSent(false)}
              className="mt-6 text-emerald-400/60 hover:text-emerald-400 text-sm transition-colors"
            >
              Try another email
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Send magic link'
              )}
            </button>

            {import.meta.env.DEV && (
              <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Development Only</span>
                </div>
              </div>

              <button
                type="button"
                onClick={bypassLogin}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-xl border border-zinc-700 transition-all text-sm"
              >
                Bypass Login (Dev)
              </button>
              </>
            )}
          </form>
        )}

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ── The login a World's own host shows (G8, 2026-10-15) ───────────────────────────────────────
// Same flow, the World's look: its surface colour, a light card, its accent on the action, its
// heading font, its language. Colours come from the CSS variables branding.ts set from the World's
// /branding.json, so nothing here is specific to one World.

const WORLD_COPY = {
  no: {
    heading: 'Logg inn',
    lead: 'Skriv inn e-postadressen din, så sender vi deg en innloggingslenke.',
    label: 'E-postadresse',
    placeholder: 'navn@eksempel.no',
    send: 'Send innloggingslenke',
    sending: 'Sender lenke …',
    sentTitle: 'Lenken er sendt',
    sentBody: (e: string) => `Sjekk innboksen til ${e} og klikk på lenken for å logge inn.`,
    again: 'Bruk en annen e-postadresse',
  },
  en: {
    heading: 'Sign in',
    lead: 'Enter your email and we will send you a sign-in link.',
    label: 'Email address',
    placeholder: 'name@example.com',
    send: 'Send sign-in link',
    sending: 'Sending link …',
    sentTitle: 'Link sent',
    sentBody: (e: string) => `Check the inbox of ${e} and click the link to sign in.`,
    again: 'Use another email address',
  },
};

function WorldLogin({ brand, email, setEmail, isSent, setIsSent, isLoading, error, onSubmit }: {
  brand: ReturnType<typeof useBrand>;
  email: string;
  setEmail: (v: string) => void;
  isSent: boolean;
  setIsSent: (v: boolean) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const t = WORLD_COPY[brand.lang];
  const ink = { color: 'var(--color-ink)' };
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--brand-surface, #f4f4f5)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl"
      >
        <div className="flex justify-center mb-6">
          <img src={brand.logoUrl} alt={`${brand.name} logo`} className="h-20 w-auto" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2" style={{ ...ink, fontFamily: 'var(--font-display, var(--font-sans))' }}>
          {t.heading}
        </h1>
        <p className="text-center mb-8 opacity-75" style={ink}>{t.lead}</p>

        {isSent ? (
          <div className="rounded-xl p-6 text-center border" style={{ borderColor: 'var(--color-accent)', ...ink }}>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent)' }} />
            <h2 className="font-semibold mb-2">{t.sentTitle}</h2>
            <p className="text-sm opacity-80">{t.sentBody(email)}</p>
            <button onClick={() => setIsSent(false)} className="mt-6 text-sm underline opacity-70 hover:opacity-100">
              {t.again}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={ink}>{t.label}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" style={ink} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full bg-white border border-zinc-300 rounded-xl py-3 pl-12 pr-4 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-all"
                  style={{ ...ink, ['--tw-ring-color' as string]: 'var(--color-accent)' }}
                  disabled={isLoading}
                />
              </div>
            </div>
            {error && <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />{t.sending}</>) : t.send}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
