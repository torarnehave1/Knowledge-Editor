// Realtime meeting recordings (R2 bucket `realtimevideos`) — parity with
// vegvisr-frontend GNewRealtimeVideoNode.vue + RealtimeVideosModal.vue.
// Node contract: type 'realtime-video', `path` = the R2 key
// (e.g. "recordings/Session.mp4"), optional `publicUrl` = ready-made URL.

export const REALTIME_VIDEO_BASE = 'https://realtimevideos.vegvisr.org';
export const RECORDINGS_ENDPOINT = 'https://api.vegvisr.org/list-meeting-recordings';

export interface Recording {
  key: string;
  path: string;
  url: string | null;
  thumbnailUrl: string | null;
  fileName: string;
  title: string;
  meetingTitle: string;
  meetingId: string;
  rtkRecordingId?: string;
  duration: number | null;
  size: number | null;
  syncedAt: string | null;
  uploadedAt: string | null;
  contentType?: string;
}

// Keys may contain spaces ("recordings/Fri flyt SlowYou ..."), so every
// segment is percent-encoded — the Vue component skips this and 404s on those.
export const resolveRealtimeVideoUrl = (
  path?: string | null,
  publicUrl?: string | null
): string | null => {
  const ready = String(publicUrl || '').trim();
  if (/^https?:\/\//i.test(ready)) return ready;

  const trimmed = String(path || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const key = trimmed.replace(/^\/+/, '');
  const withPrefix = key.startsWith('recordings/') ? key : `recordings/${key}`;
  const encoded = withPrefix.split('/').map(encodeURIComponent).join('/');
  return `${REALTIME_VIDEO_BASE}/${encoded}`;
};

export const listRecordings = async (limit = 200): Promise<Recording[]> => {
  const res = await fetch(`${RECORDINGS_ENDPOINT}?prefix=recordings/&limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load videos: ${res.status}`);
  const data = await res.json();
  return (data.recordings || []) as Recording[];
};

export const recordingLabel = (rec: Recording): string =>
  rec.meetingTitle || rec.title || rec.fileName || 'Realtime Video';

export const formatRecordingDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDuration = (seconds?: number | null): string => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

export const formatFileSize = (bytes?: number | null): string => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = size;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

// Same shape as GNewViewer.buildRealtimeVideoInfo so a node created here
// reads identically in gnew-viewer.
export const buildRealtimeVideoInfo = (rec: Recording): string => {
  const lines = ['Meeting recording video from the realtimevideos bucket.'];
  if (rec.meetingTitle) lines.push('', `Meeting: ${rec.meetingTitle}`);
  if (rec.meetingId) lines.push(`Meeting ID: ${rec.meetingId}`);
  const recordedAt = formatRecordingDate(rec.syncedAt || rec.uploadedAt);
  if (recordedAt) lines.push(`Recorded: ${recordedAt}`);
  return lines.join('\n');
};
