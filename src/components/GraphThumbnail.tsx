import { useEffect, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import { knowledgeService } from '../services/knowledgeService';
import { findGraphImage } from '../lib/graphImage';
import type { KnowledgeDocument } from '../types';

// One fetch per graph per page load, shared by every card that shows it.
const thumbnailCache = new Map<string, Promise<string>>();
// A full graph read per card: keep at most this many in flight so a long portfolio does not
// fire dozens of getknowgraph calls at once.
const MAX_IN_FLIGHT = 4;
let inFlight = 0;
const waiting: Array<() => void> = [];

function loadThumbnail(id: string): Promise<string> {
  let p = thumbnailCache.get(id);
  if (!p) {
    p = new Promise<void>(resolve => {
      if (inFlight < MAX_IN_FLIGHT) resolve();
      else waiting.push(resolve);
    })
      .then(() => {
        inFlight++;
        return knowledgeService.getGraphThumbnail(id);
      })
      .catch(() => '')
      .finally(() => {
        inFlight--;
        waiting.shift()?.();
      });
    thumbnailCache.set(id, p);
  }
  return p;
}

// imgix serves resized copies; a card needs ~600px, not the original upload.
function sized(url: string): string {
  if (!/imgix\.net/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=640&h=360&fit=crop&auto=format`;
}

interface Props {
  graphId: string;
  // The list's own thumbnail (getknowgraphsummaries): a string or null means known, so no fetch.
  // undefined (searchGraphs results) means unknown, and the graph is read when the card shows.
  thumbnail?: string | null;
  // The graph open in the editor: its picture comes from the in-memory document, so an image
  // added this session shows without a reload.
  currentDoc?: KnowledgeDocument | null;
}

export function GraphThumbnail({ graphId, thumbnail, currentDoc }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [fetched, setFetched] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const known = thumbnail !== undefined;
  const local = currentDoc
    ? currentDoc.metadata?.seoOgImage || findGraphImage(currentDoc.nodes || [])
    : known
      ? thumbnail || ''
      : null;

  useEffect(() => {
    if (local !== null || visible || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [local, visible]);

  useEffect(() => {
    if (!visible || local !== null) return;
    let alive = true;
    loadThumbnail(graphId).then(url => {
      if (alive) setFetched(url);
    });
    return () => {
      alive = false;
    };
  }, [visible, graphId, local]);

  const url = local ?? fetched;
  const loading = url === null;
  const show = !!url && !failed;

  return (
    <div
      ref={ref}
      className="relative w-full aspect-[16/9] mb-3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800"
    >
      {show ? (
        <img
          src={sized(url!)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600 ${loading ? 'animate-pulse' : ''}`}>
          <Network size={28} />
        </div>
      )}
    </div>
  );
}
