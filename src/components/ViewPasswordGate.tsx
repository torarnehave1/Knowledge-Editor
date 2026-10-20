import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';

// /view of a password-protected graph: the same gate the old viewer has
// (vegvisr-frontend/src/composables/useGraphPasswordGate.js), with the same parity rules:
// - protected = metadata.passwordProtected AND metadata.passwordHash (GNewPasswordProtectionNode)
// - the hash is btoa(password), set by the password-protection node
// - a correct password is remembered for this tab (sessionStorage), per graph
// - a signed-in Superadmin may bypass
// This is a browser-side gate only: the graph read itself is not password-checked.

const sessionKey = (graphId: string) => `graph_password_verified_${graphId}`;

export const isGraphPasswordProtected = (metadata: any) =>
  !!(metadata?.passwordProtected && metadata?.passwordHash);

export const hasGraphPasswordSession = (graphId: string) => {
  try {
    return sessionStorage.getItem(sessionKey(graphId)) === 'true';
  } catch {
    return false;
  }
};

const storedRole = (): string | null => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.role || null;
  } catch {
    return null;
  }
};

export function ViewPasswordGate({
  graphId,
  title,
  passwordHash,
  onUnlocked,
}: {
  graphId: string;
  title?: string;
  passwordHash: string;
  onUnlocked: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isSuperadmin = storedRole() === 'Superadmin';

  const unlock = () => {
    try {
      sessionStorage.setItem(sessionKey(graphId), 'true');
    } catch {
      // Storage blocked: unlock for this page load only.
    }
    onUnlocked();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    let entered = '';
    try {
      entered = btoa(password);
    } catch {
      // btoa refuses characters outside Latin-1; such a password was never stored by the node.
    }
    if (entered && entered === passwordHash) {
      unlock();
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm space-y-5"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Lock size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold">{title || 'Protected graph'}</h1>
          <p className="text-sm text-zinc-500">This graph is password protected.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          Open
        </button>
        {isSuperadmin && (
          <button
            type="button"
            onClick={unlock}
            className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Bypass as Superadmin
          </button>
        )}
      </form>
    </div>
  );
}
