/**
 * Runtime branding — the editor wears a World's look when it is served on that World's own host
 * (e.g. editor.sodesign.no, proxied by the World's brand proxy). One build serves every World:
 * nothing is baked in per customer.
 *
 * The World's brand proxy answers /branding.json on the same host from its BRAND_CONFIG
 * (`brand:<hostname>`). The editor applies it ONLY when that config carries `theme.editor` —
 * an explicit opt-in. A World host with no editor branding, and editor.vegvisr.org itself, keep
 * the editor's own look.
 *
 *   branding.brand.name / brand.slogan / brand.logoUrl   name, tagline, logo
 *   branding.meta.title / meta.faviconUrl                tab title, favicon
 *   branding.theme.editor = {
 *     fontsCssUrl,          a Google Fonts stylesheet URL
 *     fontSans, fontUi,     CSS font-family values
 *     accent, ink           colours for the --color-accent / --color-ink tokens
 *   }
 */
import { useSyncExternalStore } from 'react';

export interface Brand {
  name: string;
  tagline: string;
  logoUrl: string;
  world: boolean; // true when a World's branding is applied
}

const DEFAULT_BRAND: Brand = {
  name: 'Knowledge Editor',
  tagline: 'Build structured documents',
  logoUrl: 'https://favicons.vegvisr.org/favicons/1774177136217-1-1774177138248-512x512.png',
  world: false,
};

let current: Brand = DEFAULT_BRAND;
const listeners = new Set<() => void>();

export function useBrand(): Brand {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

// Hosts that are the editor itself, not a World wearing it.
function isOwnHost(host: string): boolean {
  return host === 'editor.vegvisr.org' || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.pages.dev');
}

function setFavicon(href: string) {
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
    l.href = href;
  });
}

export async function loadBranding(): Promise<void> {
  if (typeof window === 'undefined' || isOwnHost(window.location.hostname)) return;
  let data: any;
  try {
    const res = await fetch('/branding.json', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return;
    data = await res.json();
  } catch {
    return;
  }
  const editor = data?.theme?.editor;
  if (!editor || typeof editor !== 'object') return; // no explicit editor branding: keep our own look

  const root = document.documentElement.style;
  if (editor.fontsCssUrl && /^https:\/\/fonts\.googleapis\.com\//.test(editor.fontsCssUrl)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = editor.fontsCssUrl;
    document.head.appendChild(link);
  }
  if (editor.fontSans) root.setProperty('--font-sans', editor.fontSans);
  if (editor.fontUi || editor.fontSans) root.setProperty('--font-ui', editor.fontUi || editor.fontSans);
  if (editor.accent) root.setProperty('--color-accent', editor.accent);
  if (editor.ink) root.setProperty('--color-ink', editor.ink);

  const name = data?.brand?.name || DEFAULT_BRAND.name;
  if (data?.meta?.title || name) document.title = data?.meta?.title || name;
  if (data?.meta?.faviconUrl) setFavicon(data.meta.faviconUrl);

  current = {
    name,
    tagline: data?.brand?.slogan || '',
    logoUrl: data?.brand?.logoUrl || DEFAULT_BRAND.logoUrl,
    world: true,
  };
  listeners.forEach((l) => l());
}
