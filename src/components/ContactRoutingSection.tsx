import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  getUserPhone,
  fetchMyGroups,
  fetchGroupBots,
  type ContactAuth,
  type ChatGroup,
  type ChatBotOption,
} from '../services/contactRouting';

const MINT_URL = 'https://api.vegvisr.org/api/contact/route-token';
const ROUTE_URL = 'https://brand-worker.torarnehave.workers.dev/__contact/route';

// "Kontaktmottak" picker for a contact-form node: lists the logged-in user's
// chat groups and the bot-members of the chosen group. The user's phone is
// resolved from the sms-gateway profile (the editor user object has none).
// Saving mints a node-scoped token (api-worker, gated by the user's X-API-Token)
// then writes the {group, bot} route to the relay's KV (brand-worker) — the ids
// never touch the published HTML.
export default function ContactRoutingSection({ nodeId }: { nodeId: string }) {
  const user = useStore((s) => s.user);
  const currentGraphId = useStore((s) => s.currentGraphId);

  const [phone, setPhone] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'no-phone' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [bots, setBots] = useState<ChatBotOption[]>([]);
  const [groupId, setGroupId] = useState('');
  const [botId, setBotId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      if (!user?.user_id) {
        if (!cancelled) setStatus('no-phone');
        return;
      }
      try {
        const { phone } = await getUserPhone(user.user_id);
        if (cancelled) return;
        if (!phone) {
          setStatus('no-phone');
          return;
        }
        setPhone(phone);
        const auth: ContactAuth = { user_id: user.user_id, phone, email: user.email };
        const gs = await fetchMyGroups(auth);
        if (cancelled) return;
        setGroups(gs);
        setStatus('ready');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Kunne ikke laste grupper');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id, user?.email]);

  const onGroupChange = async (gid: string) => {
    setGroupId(gid);
    setBotId('');
    setBots([]);
    setSaveStatus('idle');
    if (!gid || !user?.user_id || !phone) return;
    const auth: ContactAuth = { user_id: user.user_id, phone, email: user.email };
    setBots(await fetchGroupBots(gid, auth));
  };

  // Mint a node-scoped token (api-worker, gated by the user's X-API-Token) and
  // write the {group, bot} route to the relay KV (brand-worker). Requires the
  // graph to have an id (it's saved) so the key matches the published form's
  // data-vgc-graph / data-vgc-node.
  const saveTarget = async () => {
    if (!groupId || !botId) return;
    const token = user?.emailVerificationToken;
    if (!currentGraphId) {
      setSaveError('Lagre grafen først, så den får en id.');
      setSaveStatus('error');
      return;
    }
    if (!token) {
      setSaveError('Mangler API-token for innlogget bruker.');
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const mintRes = await fetch(MINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Token': token },
        body: JSON.stringify({ graphId: currentGraphId, nodeId }),
      });
      const mint = await mintRes.json().catch(() => null);
      if (!mintRes.ok || !mint?.token) throw new Error((mint && mint.error) || 'Kunne ikke minte token');

      const routeRes = await fetch(ROUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: mint.token,
          graphId: currentGraphId,
          nodeId,
          group_id: groupId,
          bot_id: botId,
        }),
      });
      const route = await routeRes.json().catch(() => null);
      if (!routeRes.ok || !route?.ok) throw new Error((route && route.error) || 'Kunne ikke lagre mottaker');
      setSaveStatus('saved');
    } catch (e: any) {
      setSaveError(e?.message || 'Lagring feilet');
      setSaveStatus('error');
    }
  };

  const selectCls =
    'flex-1 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm outline-none disabled:opacity-50';

  return (
    <div
      data-node-id={nodeId}
      className="space-y-3 p-4 bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-900"
    >
      <label className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
        Kontaktmottak (gruppe + bot)
      </label>

      {status === 'loading' && <p className="text-sm text-zinc-500">Laster grupper …</p>}

      {status === 'no-phone' && (
        <p className="text-sm text-zinc-500">
          Kontoen din mangler et telefonnummer, som trengs for å hente chatgruppene dine. Legg til
          telefon i profilen din først.
        </p>
      )}

      {status === 'error' && <p className="text-sm text-red-600">{error}</p>}

      {status === 'ready' && (
        <div className="space-y-2">
          <select value={groupId} onChange={(e) => onGroupChange(e.target.value)} className={selectCls}>
            <option value="">Velg gruppe …</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            disabled={!groupId}
            className={selectCls}
          >
            <option value="">Velg bot …</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveTarget}
            disabled={!groupId || !botId || saveStatus === 'saving'}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Lagrer …' : 'Lagre mottaker'}
          </button>
          {saveStatus === 'saved' && <p className="text-[11px] text-green-600">Mottaker lagret.</p>}
          {saveStatus === 'error' && <p className="text-[11px] text-red-600">{saveError}</p>}
          <p className="text-[11px] text-zinc-400">
            Henvendelser fra dette skjemaet sendes til valgt gruppe/bot.
          </p>
        </div>
      )}
    </div>
  );
}
