import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Film, Loader2, AlertCircle, Search, RefreshCw } from 'lucide-react';
import {
  Recording,
  listRecordings,
  recordingLabel,
  resolveRealtimeVideoUrl,
  formatDuration,
  formatFileSize,
  formatRecordingDate,
} from '../services/realtimeVideos';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SortOrder = 'newest' | 'oldest' | 'title' | 'size';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (recording: Recording) => void;
}

const sortTimestamp = (rec: Recording) => {
  const value = rec.syncedAt || rec.uploadedAt;
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

export default function RealtimeVideoPicker({ open, onClose, onSelect }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selected, setSelected] = useState<Recording | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRecordings(await listRecordings(200));
    } catch (err: any) {
      console.error('Failed to load meeting recordings:', err);
      setError(err?.message || 'Failed to load meeting recordings');
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(null);
    load();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? recordings.filter((rec) =>
          [rec.title, rec.meetingTitle, rec.fileName, rec.meetingId, rec.key]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : recordings;

    return [...base].sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return sortTimestamp(a) - sortTimestamp(b);
        case 'title':
          return recordingLabel(a).localeCompare(recordingLabel(b));
        case 'size':
          return (b.size || 0) - (a.size || 0);
        default:
          return sortTimestamp(b) - sortTimestamp(a);
      }
    });
  }, [recordings, query, sortOrder]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Film size={18} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Select Realtime Video</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">realtimevideos bucket</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos, meeting titles, or IDs..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
            <option value="size">Largest First</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <Loader2 size={28} className="animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading recordings...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
              <AlertCircle size={28} />
              <p className="text-sm font-medium">{error}</p>
              <button onClick={load} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold uppercase tracking-widest">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
              <Film size={28} className="opacity-50" />
              <p className="text-sm font-medium">No recordings found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((rec) => {
                const isActive = selected?.key === rec.key;
                const meta = [
                  formatRecordingDate(rec.syncedAt || rec.uploadedAt),
                  formatDuration(rec.duration),
                  formatFileSize(rec.size),
                ].filter(Boolean);
                return (
                  <button
                    key={rec.key}
                    onClick={() => setSelected(rec)}
                    onDoubleClick={() => onSelect(rec)}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-all',
                      isActive
                        ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{recordingLabel(rec)}</p>
                        <p className="text-[11px] text-zinc-500 font-mono truncate">{rec.key}</p>
                      </div>
                      {meta.length > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                          {meta.join(' · ')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950">
          <p className="flex-1 text-[11px] text-zinc-500 font-mono truncate">
            {selected ? resolveRealtimeVideoUrl(selected.path, selected.url) : 'Select a recording'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            Use this video
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
