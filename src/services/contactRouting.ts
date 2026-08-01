// Contact-form routing picker data source.
// Mirrors vegvisr-chat/src/services/chat-service.ts (fetchGroups / fetchGroupBots
// / authQuery) so the Knowledge-Editor can list the logged-in user's chat groups
// and the bot-members of a chosen group. Auth is user_id + phone + email passed
// as query params (no custom headers → no CORS preflight, same as vegvisr-chat).
//
// The editor's user object has no phone, so getUserPhone() resolves it from the
// sms-gateway profile endpoint by user_id first.

const CHAT_BASE = 'https://group-chat-worker.torarnehave.workers.dev';
const PROFILE_URL = 'https://smsgway.vegvisr.org/api/auth/profile';

export interface ContactAuth {
  user_id: string;
  phone: string;
  email?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
}

export interface ChatBotOption {
  id: string;
  name: string;
  username?: string;
}

function qs(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

function authQuery(auth: ContactAuth): string {
  return qs({ user_id: auth.user_id, phone: auth.phone, email: auth.email });
}

// Resolve the user's phone (+ verified flag) from the sms-gateway profile by user_id.
// group-chat /groups and /groups/:id/bots require phone; the editor user has none.
export async function getUserPhone(userId: string): Promise<{ phone: string | null; verified: boolean }> {
  const res = await fetch(`${PROFILE_URL}?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) return { phone: null, verified: false };
  const data = await res.json().catch(() => null);
  if (!data || !data.success) return { phone: null, verified: false };
  return { phone: data.phone || null, verified: !!data.verified };
}

// Groups the logged-in user is a MEMBER of.
export async function fetchMyGroups(auth: ContactAuth): Promise<ChatGroup[]> {
  const res = await fetch(`${CHAT_BASE}/groups?${authQuery(auth)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.success) {
    throw new Error((data && data.error) || 'Kunne ikke hente grupper');
  }
  return data.groups || [];
}

// Bot-members of a specific group (graceful empty on none / no permission).
export async function fetchGroupBots(groupId: string, auth: ContactAuth): Promise<ChatBotOption[]> {
  const res = await fetch(`${CHAT_BASE}/groups/${encodeURIComponent(groupId)}/bots?${authQuery(auth)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.success) return [];
  return data.bots || [];
}
