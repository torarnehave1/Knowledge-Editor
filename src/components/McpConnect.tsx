import React, { useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useBrand } from '../branding';

// Signing an AI client (Gemini, Claude, ChatGPT …) in to the VEGR.AI MCP server with the session
// that lives in THIS editor.
//
// The MCP server's sign-in page is on knowledge.vegvisr.org. It cannot see a login kept on a
// World's own domain, and its SMS code takes Norwegian numbers only — so a World Founder abroad
// could not connect at all (2026-11-19). The sign-in page therefore sends her here with
// ?mcp_connect=<one-time id>; she confirms, and the editor posts that id and her login token back.
//
// Three rules this file keeps:
//   * The token goes to ONE fixed address, written here — never to anything taken from the URL.
//   * Nothing is sent without a click. A link alone must not be able to start it.
//   * The id leaves the address bar at once, so it is not shared, bookmarked or sent as a referrer.
const MCP_AUTHORIZE = 'https://knowledge.vegvisr.org/authorize';
const STORE_KEY = 'mcpConnect';
// The server keeps the id 15 minutes; a shade less here so a late click says so plainly.
const MAX_AGE_MS = 14 * 60 * 1000;

type Pending = { id: string; at: number };

const readPending = (): Pending | null => {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!p || !/^[0-9a-f]{48}$/.test(p.id) || Date.now() - p.at > MAX_AGE_MS) {
      localStorage.removeItem(STORE_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
};

// Runs when this module is first loaded — before the app reads the address, and before a sign-in
// link is asked for. Kept in localStorage, not in the URL, because a sign-in link opens in a new
// tab: the same editor, the same storage, no address to carry it in.
(() => {
  try {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('mcp_connect');
    if (id === null) return;
    url.searchParams.delete('mcp_connect');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (/^[0-9a-f]{48}$/.test(id)) {
      localStorage.setItem(STORE_KEY, JSON.stringify({ id, at: Date.now() }));
    }
  } catch {
    /* no address to read: nothing to connect */
  }
})();

const TEXT = {
  en: {
    title: 'Connect an AI client to VEGR.AI?',
    body: 'You started connecting an AI client (for example Gemini, Claude or ChatGPT) to your VEGR.AI account',
    next: 'On the next page you see which client it is and what it may do, and you approve or decline there.',
    warn: 'Only continue if you started this yourself.',
    go: 'Continue',
    cancel: 'Cancel',
    signIn: 'Sign in to connect your AI client to VEGR.AI.',
  },
  no: {
    title: 'Koble en AI-klient til VEGR.AI?',
    body: 'Du har startet å koble en AI-klient (for eksempel Gemini, Claude eller ChatGPT) til VEGR.AI-kontoen din',
    next: 'På neste side ser du hvilken klient det er og hva den får lov til, og du godkjenner eller avslår der.',
    warn: 'Fortsett bare hvis du startet dette selv.',
    go: 'Fortsett',
    cancel: 'Avbryt',
    signIn: 'Logg inn for å koble AI-klienten din til VEGR.AI.',
  },
};

export const McpConnect: React.FC = () => {
  const brand = useBrand();
  const user = useStore((s) => s.user);
  const [pending, setPending] = useState<Pending | null>(() => readPending());
  const t = brand.lang === 'no' ? TEXT.no : TEXT.en;

  // A sign-in finished in this tab or another one: look again.
  useEffect(() => {
    setPending(readPending());
    const onStorage = () => setPending(readPending());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  if (!pending) return null;

  const token = localStorage.getItem('emailVerificationToken');
  const cancel = () => {
    localStorage.removeItem(STORE_KEY);
    setPending(null);
  };

  if (!user || !token) {
    return (
      <div className="fixed top-0 inset-x-0 z-[100] bg-zinc-900 text-white text-sm px-4 py-2 flex items-center justify-center gap-3">
        <Plug className="w-4 h-4 shrink-0" />
        <span>{t.signIn}</span>
        <button type="button" onClick={cancel} className="underline opacity-80 hover:opacity-100">
          {t.cancel}
        </button>
      </div>
    );
  }

  const go = () => {
    const fresh = readPending();
    localStorage.removeItem(STORE_KEY);
    if (!fresh) {
      setPending(null);
      return;
    }
    // A real form, not fetch: the answer is the consent page, and the browser has to go there.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = MCP_AUTHORIZE;
    for (const [name, value] of [['action', 'world-token'], ['handoff', fresh.id], ['token', token]]) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.title}>
      <div className="bg-white text-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-3">
          <Plug className="w-5 h-5 shrink-0" />
          <h2 className="text-lg font-semibold">{t.title}</h2>
        </div>
        <p className="text-sm text-zinc-700">
          {t.body} <strong>{user.email}</strong>.
        </p>
        <p className="text-sm text-zinc-700 mt-3">{t.next}</p>
        <p className="text-sm font-medium mt-3">{t.warn}</p>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={go} className="flex-1 rounded-lg bg-zinc-900 text-white py-2.5 text-sm font-semibold hover:bg-zinc-800">
            {t.go}
          </button>
          <button type="button" onClick={cancel} className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm hover:bg-zinc-50">
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
