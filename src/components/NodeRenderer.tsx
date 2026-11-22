import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Node } from '../types';
import { Music, Play, Pause, Volume2, SkipBack, SkipForward, Activity, Film, Maximize2, Minus, Plus, X } from 'lucide-react';
import { resolveRealtimeVideoUrl, resolveCloudflareVideo } from '../services/realtimeVideos';
import { RegisteredTypeNode, useApprovedTypes } from '../lib/vegvisrNode';
import { useStore } from '../store/useStore';
import { useBrand } from '../branding';
import ImageCreditModal, { ImageAttribution } from './ImageCreditModal';

interface NodeRendererProps {
  node: Node;
  // Editor (not /view): each image gets a button to set its photo credit.
  editable?: boolean;
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Caption for an image's credit, as HTML (images built as HTML strings) — "Foto: Navn – tekst".
function creditHtml(a: any, lang: 'no' | 'en'): string {
  if (!a || !a.requires_attribution) return '';
  const name = a.photographer ? escapeAttr(String(a.photographer)) : '';
  const url = a.photographer_url && /^https?:\/\//i.test(a.photographer_url) ? escapeAttr(a.photographer_url) : '';
  const extra = a.custom_attribution ? escapeAttr(String(a.custom_attribution)) : '';
  if (!name && !extra) return '';
  const who = name ? (url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${name}</a>` : name) : '';
  const parts = [who ? `${lang === 'no' ? 'Foto' : 'Photo'}: ${who}` : '', extra].filter(Boolean).join(' – ');
  // span, not div: a markdown image sits inside a <p>.
  return `<span class="image-credit" style="display: block; font-size: 0.8em; color: #71717a; margin-top: 6px; line-height: 1.4;">${parts}</span>`;
}

function creditButtonHtml(url: string, has: boolean, lang: 'no' | 'en'): string {
  const label = lang === 'no' ? (has ? 'Endre kreditering' : 'Krediter fotograf') : (has ? 'Edit credit' : 'Credit photographer');
  return `<button type="button" data-credit-url="${escapeAttr(url)}" style="margin-top: 6px; font-size: 0.75em; padding: 3px 10px; border-radius: 999px; border: 1px solid #d4d4d8; background: #fff; color: #3f3f46; cursor: pointer;">✎ ${label}</button>`;
}

// Mermaid is loaded on demand (separate chunk) the first time a
// mermaid-diagram node renders. Same init settings as vegvisr-frontend
// src/utils/mermaid.js.
let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null;
const getMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        logLevel: 'error',
      });
      return m.default;
    });
  }
  return mermaidPromise;
};

let mermaidIdCounter = 0;

// One rendering of a diagram. The inline view and the full-window view each render their own
// copy, so no element id appears twice on the page.
function useMermaidSvg(code: string) {
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRenderError(null);
    getMermaid()
      .then((mermaid) => mermaid.render(`mermaid-graph-${++mermaidIdCounter}`, code))
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch((err) => {
        console.error('Mermaid rendering error:', err);
        if (!cancelled) setRenderError(err?.message || 'Failed to render diagram');
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return { svg, renderError };
}

function MermaidError({ message, code }: { message: string; code: string }) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
      <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">Error rendering Mermaid diagram: {message}</p>
      <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap overflow-x-auto">{code}</pre>
    </div>
  );
}

// A Gantt chart is laid out to the width it is drawn in, so on a phone its labels collide. In the
// full window it is laid out wide and scaled to fit, and zooming brings the labels up.
const wideGantt = (code: string) =>
  /^\s*gantt\b/.test(code) && !code.includes('%%{') ? `%%{init: {"gantt": {"useWidth": 1600}}}%%\n${code}` : code;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// A diagram in the whole window, with zoom and pan: buttons, the wheel, dragging with the mouse
// or one finger, pinching with two fingers. It is a fixed layer drawn on <body>, not the
// browser's Fullscreen API, which iPhone does not offer for anything but video.
function MermaidFullView({ code, title, onClose }: { code: string; title?: string; onClose: () => void }) {
  const lang = useBrand().lang;
  const { svg, renderError } = useMermaidSvg(wideGantt(code));
  const [t, setT] = useState({ z: 1, x: 0, y: 0 });
  const zRef = useRef(1);
  zRef.current = t.z;
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const zoomBy = (f: number) => setT((p) => ({ ...p, z: clampZoom(p.z * f) }));
  const reset = () => setT({ z: 1, x: 0, y: 0 });

  // The drawing fills the sheet; its viewBox keeps the proportions.
  useEffect(() => {
    const el = sheetRef.current?.querySelector('svg');
    if (!el) return;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.maxWidth = 'none';
  }, [svg]);

  useEffect(() => {
    closeRef.current?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-') zoomBy(1 / 1.25);
      else if (e.key === '0') reset();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = before;
    };
  }, [onClose]);

  const spread = () => {
    const [a, b] = [...pts.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const drop = (e: React.PointerEvent<HTMLDivElement>) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
  };

  const tool =
    'inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Diagram'}
      className="fixed inset-0 z-[1000] flex flex-col bg-white dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <strong className="min-w-0 flex-1 basis-40 text-base text-zinc-900 dark:text-zinc-100 break-words">{title}</strong>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={tool} aria-label={lang === 'no' ? 'Zoom ut' : 'Zoom out'} onClick={() => zoomBy(1 / 1.25)}>
            <Minus size={16} />
          </button>
          <span className="min-w-12 text-center text-sm tabular-nums text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {Math.round(t.z * 100)}%
          </span>
          <button type="button" className={tool} aria-label={lang === 'no' ? 'Zoom inn' : 'Zoom in'} onClick={() => zoomBy(1.25)}>
            <Plus size={16} />
          </button>
          <button type="button" className={tool} onClick={reset}>
            {lang === 'no' ? 'Tilpass' : 'Fit'}
          </button>
          <button ref={closeRef} type="button" className={tool} onClick={onClose}>
            <X size={16} className="mr-1" />
            {lang === 'no' ? 'Lukk' : 'Close'}
          </button>
        </div>
      </div>
      <div
        className="relative flex-1 min-h-0 overflow-hidden bg-white touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* the pointer is already gone */
          }
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.current.size === 2) pinch.current = { d: spread(), z: zRef.current };
        }}
        onPointerMove={(e) => {
          const prev = pts.current.get(e.pointerId);
          if (!prev) return;
          const dx = e.clientX - prev.x;
          const dy = e.clientY - prev.y;
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const p = pinch.current;
          if (pts.current.size >= 2 && p && p.d > 0) {
            const z = clampZoom((p.z * spread()) / p.d);
            setT((o) => ({ ...o, z }));
          } else if (pts.current.size === 1) setT((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
        }}
        onPointerUp={drop}
        onPointerCancel={drop}
        onWheel={(e) => zoomBy(e.deltaY > 0 ? 1 / 1.15 : 1.15)}
      >
        {renderError ? (
          <div className="absolute inset-0 overflow-auto p-4">
            <MermaidError message={renderError} code={code} />
          </div>
        ) : (
          <div
            ref={sheetRef}
            className="absolute inset-3 flex items-center justify-center"
            style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})`, transformOrigin: 'center center' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function MermaidDiagram({ code, title }: { code: string; title?: string }) {
  const lang = useBrand().lang;
  const { svg, renderError } = useMermaidSvg(code);
  const [full, setFull] = useState(false);
  const close = React.useCallback(() => setFull(false), []);

  if (renderError) return <MermaidError message={renderError} code={code} />;

  const label = lang === 'no' ? 'Vis i fullt vindu' : 'Show in full window';
  return (
    <div className="relative my-4">
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setFull(true)}
          title={label}
          aria-label={label}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <Maximize2 size={14} />
          {label}
        </button>
      </div>
      <div
        className="w-full overflow-x-auto flex justify-center items-center [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {full && <MermaidFullView code={code} title={title} onClose={close} />}
    </div>
  );
}

// album-video: a video file from a Photos album. `path` is the full public URL the album list
// returns — never rebuilt from a key, because a World with its own storage serves from another host.
function AlbumVideo({ node, renderInfo }: { node: Node; renderInfo: () => React.ReactNode }) {
  const raw = String(node.path || '').trim();
  const videoUrl = /^https?:\/\//i.test(raw) ? raw : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [videoUrl]);

  return (
    <div className="space-y-4">
      {videoUrl ? (
        <div className="w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
          <video
            key={videoUrl}
            src={videoUrl}
            title={node.label}
            className="block w-full max-h-[70vh] bg-black"
            controls
            preload="metadata"
            playsInline
            onError={() => setFailed(true)}
            onLoadedMetadata={() => setFailed(false)}
          />
          {failed && (
            <p className="px-4 py-3 text-sm bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              This video cannot be played in this browser. iPhone .mov files often only play in Safari —{' '}
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="underline">open the file directly</a>.
            </p>
          )}
        </div>
      ) : (
        <div className="w-full py-12 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400 gap-2">
          <Film size={24} className="opacity-50" />
          <p className="text-sm font-medium">No album video selected</p>
          <p className="text-xs">Edit this section and paste the URL of a video from a Photos album.</p>
        </div>
      )}
      {renderInfo()}
    </div>
  );
}

export default function NodeRenderer({ node, editable = false }: NodeRendererProps) {
  // Types with an approved renderer in graph_system_registry (the rendering engine). Called before
  // any early return, as hooks must be.
  // With the open graph's World, that World's own types too (phase 2).
  const world = useStore((s) => s.graphWorld);
  const saveNode = useStore((s) => s.saveNode);
  const lang = useBrand().lang;
  const [creditUrl, setCreditUrl] = useState<string | null>(null);
  const attributions = node.imageAttributions || {};
  // Caption + (in the editor) credit button under an image. Applied in the markdown img component,
  // which also receives the <img> of HTML-built images (header, side images) via rehype-raw.
  const creditBlock = (url: string) =>
    creditHtml(attributions[url], lang) + (editable ? creditButtonHtml(url, !!attributions[url], lang) : '');
  // One click handler for the whole node: the buttons live in HTML strings and are rebuilt on
  // every render, so per-button listeners would be lost (the vegvisr.org bug, 2026-11-06).
  const onCreditClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('[data-credit-url]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    setCreditUrl(btn.getAttribute('data-credit-url'));
  };
  const writeCredit = (url: string, a: ImageAttribution | null) => {
    const next = { ...attributions };
    if (a) next[url] = a; else delete next[url];
    saveNode({ ...node, imageAttributions: next });
    setCreditUrl(null);
  };
  const approvedTypes = useApprovedTypes(world);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (node.type === 'audio' && node.path) {
    return (
      <div className="my-8 p-8 rounded-[2.5rem] bg-[#151619] border border-zinc-800 shadow-2xl overflow-hidden relative group">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-zinc-800/50 border border-zinc-700 text-indigo-400">
                <Music size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{node.label}</h3>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Audio Stream • High Quality</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">
                {isPlaying ? 'Live' : 'Idle'}
              </span>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={node.path}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                step="0.01"
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8">
              <button className="text-zinc-500 hover:text-white transition-colors">
                <SkipBack size={20} />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              <button className="text-zinc-500 hover:text-white transition-colors">
                <SkipForward size={20} />
              </button>
            </div>

            {/* Volume / Extra */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-3 text-zinc-500">
                <Volume2 size={16} />
                <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-zinc-600"></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Activity size={16} className={isPlaying ? 'text-indigo-400' : 'text-zinc-700'} />
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">44.1kHz / 24-bit</span>
              </div>
            </div>
          </div>
        </div>

        {node.info && (
          <div className="mt-8 pt-8 border-t border-zinc-800/50">
            <div className="prose prose-invert prose-sm max-w-none opacity-60 group-hover:opacity-100 transition-opacity">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {processContent(node.info, node.commentaries)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'audio-visualizer') {
    return (
      <div className="my-8 p-8 rounded-[2.5rem] bg-[#151619] border border-zinc-800 shadow-2xl overflow-hidden relative">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-zinc-800/50 border border-zinc-700 text-emerald-400">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{node.label}</h3>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Real-time Waveform Analysis</p>
          </div>
        </div>
        
        <div className="h-48 flex items-end justify-between gap-1 px-4">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i} 
              className="flex-1 bg-gradient-to-t from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ 
                height: `${Math.random() * 80 + 10}%`,
                opacity: Math.random() * 0.5 + 0.5
              }}
            ></div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {['Frequency', 'Amplitude', 'Phase'].map((stat) => (
            <div key={stat} className="p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800/50 text-center">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{stat}</p>
              <p className="text-sm font-bold text-white font-mono">{(Math.random() * 100).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Shared by the video nodes: their info gets the same macro processing ([SECTION], [FANCY],
  // [COMMENTARY] …) as every other node. It used to go to ReactMarkdown raw, so a SECTION
  // showed up as literal "[SECTION | …]" text under the video.
  const renderInfo = () =>
    node.info ? (
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {processContent(node.info, node.commentaries)}
        </ReactMarkdown>
      </div>
    ) : null;

  if (node.type === 'youtube-video') {
    // Where the video is, in the order nodes are written across VEGR.AI: path (registry,
    // MCP), the ![YOUTUBE src=…] macro in the label (canonical frontend form, path null),
    // then the source list. A node with path null used to show no player here at all.
    const labelSrc = (node.label || '').match(/!\[YOUTUBE src=(.*?)\]/)?.[1] || '';
    const biblSrc = (Array.isArray(node.bibl) ? node.bibl : []).find((u: string) => getYouTubeId(u)) || '';
    const source = node.path || labelSrc || biblSrc;
    const videoId = getYouTubeId(source);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : (source.includes('embed') ? source : null);
    // The label macro is the player, not text: when the info also embeds the same video,
    // skip the second player.
    const infoHasPlayer = !!videoId && (node.info || '').includes(videoId) && /\[YOUTUBE src=/.test(node.info || '');

    if (embedUrl && !infoHasPlayer) {
      return (
        <div className="space-y-4">
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
            <iframe
              src={embedUrl}
              title={(node.label || '').replace(/!\[YOUTUBE src=.*?\](.*?)\[END YOUTUBE\]/, '$1')}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {renderInfo()}
        </div>
      );
    }
    if (!node.info) return null;
    return renderInfo();
  }

  if (node.type === 'album-video') {
    return <AlbumVideo node={node} renderInfo={renderInfo} />;
  }

  // kurs-steg: one step of a course (agent-worker world-course.js). A video step carries the
  // video in `path` exactly as a realtime-video node does, so it plays in the same player. A text
  // step has no path and falls through to the ordinary text rendering below.
  if (node.type === 'realtime-video' || (node.type === 'kurs-steg' && node.path)) {
    const videoUrl = resolveRealtimeVideoUrl(node.path, node.publicUrl);

    return (
      <div className="space-y-4">
        {videoUrl ? (
          <div className="w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
            <video
              src={videoUrl}
              title={node.label}
              className="block w-full max-h-[70vh] bg-black"
              controls
              preload="metadata"
              playsInline
            />
          </div>
        ) : (
          <div className="w-full py-12 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Film size={24} className="opacity-50" />
            <p className="text-sm font-medium">No realtime video selected</p>
            <p className="text-xs">Edit this section and pick a recording, or paste an MP4 URL.</p>
          </div>
        )}
        {renderInfo()}
      </div>
    );
  }

  if (node.type === 'cloudflare-video') {
    const video = resolveCloudflareVideo(node as any);
    // Legacy nodes keep the Stream iframe in info; that is the player, not a description.
    const infoIsEmbed = /^\s*<iframe/i.test(node.info || '') || (node.info || '').includes('cloudflarestream.com');

    return (
      <div className="space-y-4">
        {video?.kind === 'stream' ? (
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
            <iframe
              src={video.embedUrl}
              title={node.label}
              className="w-full h-full border-none"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : video?.kind === 'file' ? (
          <div className="w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
            <video
              src={video.url}
              title={node.label}
              className="block w-full max-h-[70vh] bg-black"
              controls
              preload="metadata"
              playsInline
            />
          </div>
        ) : (
          <div className="w-full py-12 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Film size={24} className="opacity-50" />
            <p className="text-sm font-medium">No Cloudflare video configured</p>
            <p className="text-xs">Set the path to a Cloudflare Stream video ID or an MP4 URL.</p>
          </div>
        )}
        {!infoIsEmbed && renderInfo()}
      </div>
    );
  }

  // A registered data type with an approved renderer: drawn by <vegvisr-node> in an isolated
  // iframe. Checked before the empty-text rule below: such a node may carry all its content in
  // metadata (e.g. project-timeline-event: date, kind, participants) with an empty info. Only
  // registered data types have such a renderer, so the built-in branches are untouched.
  if (node.type && approvedTypes.has(node.type)) {
    const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    return <RegisteredTypeNode node={{ ...node, metadata: node.metadata || {} }} theme={dark ? 'dark' : 'light'} world={world} />;
  }

  if (!node.info) return null;

  if (node.type === 'mermaid-diagram') {
    return <MermaidDiagram code={node.info} title={node.label} />;
  }

  if (node.type === 'html-node') {
    // WYSIWYG: if the html-node is a contact-form marker, inject the SSOT
    // component script into the iframe (sandbox allows scripts + same-origin)
    // so the real form mounts in the editor preview — the user sees exactly what
    // will publish. No-op for html without the marker.
    const withContactScript = (html: string | null): string => {
      const h = html || '';
      if (h.indexOf('data-vegvisr-contact') === -1 || h.indexOf('/components/contact-form.js') !== -1) return h;
      return h + '<script src="https://api.vegvisr.org/components/contact-form.js" defer></script>';
    };
    return (
      <div className="w-full h-[800px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-white">
        <iframe
          srcDoc={withContactScript(node.info)}
          title={node.label}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin allow-downloads"
          allow="microphone; display-capture; clipboard-write"
        />
      </div>
    );
  }

  // Handle ![Leftside-N|styles](url) / ![Rightside-N|styles](url) — parity
  // with vegvisr-frontend processLeftRightImages: the image sits beside the
  // next N non-empty lines (default 1) in a flex row; Rightside flips order.
  // A function declaration (hoisted), so the video branches above can use processContent.
  function processSideImages(text: string) {
    const lines = text.split('\n');
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].trim().match(/^!\[(Rightside|Leftside)(?:-(\d+))?\s*\|\s*([^\]]+?)\s*\]\((.+?)\)(.*)$/);
      if (!m) {
        out.push(lines[i]);
        i++;
        continue;
      }
      const [, type, nStr, styles, url, after] = m;
      const paragraphCount = parseInt(nStr, 10) || 1;
      const paras: string[] = [];
      if (after.trim()) paras.push(after.trim());
      let j = i + 1;
      while (paras.length < paragraphCount && j < lines.length) {
        if (lines[j].trim() !== '') paras.push(lines[j]);
        j++;
      }
      const getStyle = (key: string, fallback: string) => {
        const found = styles.match(new RegExp(key + `: *['"]?([^;'"]+)['"]?`, 'i'));
        return found ? found[1].trim() : fallback;
      };
      let width = getStyle('width', '20%');
      if (/^\d+$/.test(width)) width += 'px';
      let height = getStyle('height', '200px');
      if (/^\d+$/.test(height)) height += 'px';
      const objectFit = getStyle('object-fit', 'cover');
      const objectPosition = getStyle('object-position', 'center');

      // The image column takes the image's own width; the text column starts from a
      // fixed basis and grows. With `flex: 1 1 auto` the text's basis was its full
      // one-line width, so in this wrapping row it always dropped below the image.
      // Now the text sits beside the image, and drops below only on narrow screens.
      const isPercentWidth = width.endsWith('%');
      const imageFlex = isPercentWidth ? `flex: 0 0 ${width}; max-width: 100%;` : 'flex: 0 0 auto; max-width: 100%;';
      const imgWidth = isPercentWidth ? '100%' : width;
      const contentFlex = 'flex: 1 1 240px; min-width: 0; overflow-wrap: break-word;';
      const imgOrder = type === 'Rightside' ? ' order: 2;' : '';
      const contentOrder = type === 'Rightside' ? ' order: 1;' : '';
      out.push(
        '',
        `<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; width: 100%; margin: 16px 0;"><div style="${imageFlex}${imgOrder}"><img src="${url}" alt="${type} Image" style="width: ${imgWidth}; max-width: 100%; height: ${height}; object-fit: ${objectFit}; object-position: ${objectPosition}; border-radius: 8px; margin: 0;" /></div><div style="${contentFlex}${contentOrder}">`,
        '',
        ...paras,
        '',
        '</div></div>',
        ''
      );
      i = j;
    }
    return out.join('\n');
  }

  // Simple pre-processor for custom tags
  // Hoisted for the same reason: youtube-video and realtime-video info must get the same
  // macro processing ([SECTION], [FANCY] …) as any other node, not raw markdown.
  function processContent(content: string, commentaries?: any[]) {
    let processed = processSideImages(content);

    // Handle ![YOUTUBE src=...]title[END YOUTUBE]
    processed = processed.replace(/!\[YOUTUBE src=(.*?)\](.*?)\[END YOUTUBE\]/g, (_, src, title) => {
      const videoId = getYouTubeId(src);
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : src;
      return `\n\n<div class="my-6 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-lg bg-black aspect-video"><iframe src="${embedUrl}" title="${title}" class="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>\n\n`;
    });

    // Handle [COMMENTARY | id='...']...[END COMMENTARY]
    let footnoteIndex = 1;
    processed = processed.replace(/\[COMMENTARY \| id='(.*?)'\]([\s\S]*?)\[END COMMENTARY\]/g, (_, id, text) => {
      const commentary = commentaries?.find(c => c.id === id);
      if (commentary) {
        const index = footnoteIndex++;
        return `<span class="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-400/50 px-0.5 rounded-sm cursor-help group relative" title="${commentary.text}">
          ${text}<sup class="text-indigo-600 dark:text-indigo-400 font-bold ml-0.5">${index}</sup>
        </span>`;
      }
      return text;
    });

    // Handle [QUOTE | Cited='...']...[END QUOTE]
    processed = processed.replace(/\[QUOTE\s*\|\s*Cited\s*=\s*['"]?(.*?)['"]?\]([\s\S]*?)\[END QUOTE\]/gi, (_, cited, text) => {
      return `\n\n<blockquote class="border-l-4 border-indigo-500 pl-6 my-8 italic text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 py-6 pr-8 rounded-r-3xl shadow-sm overflow-hidden"><div class="mb-3 leading-relaxed break-words">\n\n${text}\n\n</div><cite class="block mt-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 not-italic uppercase tracking-wider">— ${cited}</cite></blockquote>\n\n`;
    });

    // Handle [FLEXBOX-CARDS] / [FLEXBOX-CARDS-N] ... [END FLEXBOX]
    // Card syntax (parity with vegvisr-frontend FlexboxCards.vue): a standalone
    // **Title** line starts a card, ![alt](url) is the card image, other lines
    // become the card text.
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    processed = processed.replace(/\[FLEXBOX-CARDS(?:-(\d+))?\]([\s\S]*?)\[END\s+FLEXBOX\]/gi, (_, cols, body) => {
      const columnCount = Math.min(Math.max(parseInt(cols, 10) || 3, 1), 6);
      const cards: { title: string; image: string; imageAlt: string; text: string }[] = [];
      let current = { title: '', image: '', imageAlt: '', text: '' };
      let started = false;
      for (const rawLine of body.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const titleMatch = line.match(/^\*\*(.+?)\*\*$/);
        if (titleMatch) {
          if (started && (current.title || current.image || current.text)) cards.push({ ...current });
          current = { title: titleMatch[1], image: '', imageAlt: '', text: '' };
          started = true;
          continue;
        }
        const imageMatch = line.match(/!\[([^\]]*?)\]\(([^)]+)\)/);
        if (imageMatch && started) {
          current.imageAlt = imageMatch[1];
          current.image = imageMatch[2];
          continue;
        }
        if (started) current.text += (current.text ? ' ' : '') + line;
      }
      if (started && (current.title || current.image || current.text)) cards.push(current);
      if (cards.length === 0) return '';

      const cardWidth = `flex: 0 1 calc(${(100 / columnCount).toFixed(3)}% - 20px); max-width: calc(${(100 / columnCount).toFixed(3)}% - 20px); min-width: 220px;`;
      const cardsHtml = cards.map((c) => {
        const img = c.image
          ? `<img src="${c.image}" alt="${escapeHtml(c.imageAlt)}" class="w-full h-[200px] object-cover rounded-lg mb-4" style="margin:0;" />`
          : '';
        const title = c.title ? `<h4 class="text-lg font-semibold mb-3" style="margin:0 0 12px 0;">${escapeHtml(c.title)}</h4>` : '';
        const text = c.text ? `<div class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed text-left w-full">${escapeHtml(c.text)}</div>` : '';
        return `<div class="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-md border border-zinc-100 dark:border-zinc-800 text-center flex flex-col items-center" style="${cardWidth}">${img}${title}${text}</div>`;
      }).join('');
      return `\n\n<div class="flex flex-wrap justify-center my-8" style="gap: 20px;">${cardsHtml}</div>\n\n`;
    });

    // Handle [FLEXBOX-GRID] ... [END FLEXBOX] — parity with FlexboxGrid.vue:
    // every ![alt](url) becomes a framed grid item; 3 columns, 2 on tablet,
    // 1 on mobile.
    const extractImages = (body: string) =>
      [...body.matchAll(/!\[([^\]]*?)\]\(([^)]+)\)/g)].map((m) => ({ alt: m[1], src: m[2] }));
    processed = processed.replace(/\[FLEXBOX-GRID(?:\s*\|[^\]]*)?\]([\s\S]*?)\[END\s+FLEXBOX\]/gi, (_, body) => {
      const images = extractImages(body);
      if (images.length === 0) return '';
      const items = images.map((img) =>
        `<div class="w-full rounded-lg overflow-hidden shadow-md bg-white dark:bg-zinc-900"><img src="${img.src}" alt="${escapeHtml(img.alt)}" class="w-full h-auto block object-cover" style="margin:0;" /></div>`
      ).join('');
      return `\n\n<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[1000px] mx-auto my-8 justify-items-center items-start">${items}</div>\n\n`;
    });

    // Handle [FLEXBOX-GALLERY] ... [END FLEXBOX] — parity with
    // FlexboxGallery.vue: fixed-size thumbnails in a wrapping, centered flex
    // row with hover scale.
    processed = processed.replace(/\[FLEXBOX-GALLERY(?:\s*\|[^\]]*)?\]([\s\S]*?)\[END\s+FLEXBOX\]/gi, (_, body) => {
      const images = extractImages(body);
      if (images.length === 0) return '';
      const items = images.map((img) =>
        `<div class="flex-none rounded-xl overflow-hidden shadow-md bg-white dark:bg-zinc-900 transition-transform duration-300 hover:scale-105 hover:shadow-xl"><img src="${img.src}" alt="${escapeHtml(img.alt)}" class="w-[250px] h-[200px] object-cover block rounded-xl max-sm:w-[160px] max-sm:h-[130px]" style="margin:0;" /></div>`
      ).join('');
      return `\n\n<div class="flex flex-wrap gap-5 justify-center items-start max-w-[1000px] mx-auto my-8">${items}</div>\n\n`;
    });

    // Handle remaining FLEXBOX variants (plain FLEXBOX, -ROW) as a wrapping
    // flex row; inner markdown (images) still parsed by the renderer.
    processed = processed.replace(/\[FLEXBOX(?:-ROW)?(?:\s*\|[^\]]*)?\]([\s\S]*?)\[END\s+FLEXBOX\]/gi, (_, body) => {
      return `\n\n<div class="flex flex-wrap gap-4 justify-center items-center my-6">\n\n${body}\n\n</div>\n\n`;
    });

    // Shared parser (parity with GNewDefaultNode parseQuoteParams): pull
    // Cited= / cited: out of the params, keep remaining CSS props.
    const parseQuoteParams = (style: string) => {
      let cited = 'Unknown';
      const citedMatch = style.match(/Cited\s*=\s*['"]?([^'";]+)['"]?/i) || style.match(/cited\s*:\s*['"]?([^'";]+)['"]?/i);
      if (citedMatch) cited = citedMatch[1].trim();
      const cssProps: string[] = [];
      const cssRegex = /([\w-]+)\s*:\s*['"]?([^'";]+)['"]?/g;
      let cm;
      while ((cm = cssRegex.exec(style)) !== null) {
        if (cm[1].toLowerCase() !== 'cited') cssProps.push(`${cm[1].toLowerCase()}: ${cm[2].trim()}`);
      }
      return { cited, styles: cssProps.join('; ') };
    };

    // Handle [IMAGEQUOTE ...params...]...[END IMAGEQUOTE] — quote text over a
    // background image; params parity with parseImageQuoteParams.
    processed = processed.replace(/\[IMAGEQUOTE\s*([^\]]*)\]([\s\S]*?)\[END\s+IMAGEQUOTE\]/gi, (_, params, content) => {
      const p: Record<string, string> = {};
      for (const m of params.matchAll(/(\w+):\s*(?:'([^']*)'|"([^"]*)"|([^\s]+))/g)) {
        p[m[1]] = m[2] || m[3] || m[4];
      }
      const container = [
        p.backgroundImage ? `background-image: url('${p.backgroundImage}')` : 'background-image: none',
        `aspect-ratio: ${p.aspectRatio || '16/9'}`,
        'display: flex', 'align-items: center', 'justify-content: center',
        'background-size: cover', 'background-position: center',
        'border-radius: 8px', 'margin: 15px 0', 'position: relative',
        `width: ${p.width || '100%'}`, `height: ${p.height || 'auto'}`, 'min-height: 200px',
      ].join('; ');
      const contentStyle = [
        'color: white', 'text-shadow: 2px 2px 4px rgba(0,0,0,0.7)',
        `text-align: ${p.textAlign || 'center'}`, `padding: ${p.padding || '2rem'}`,
        `font-size: ${p.fontSize || '1.5rem'}`,
      ].join('; ');
      const citation = p.cited
        ? `<div style="position: absolute; bottom: 10px; right: 15px; font-size: 0.9em; opacity: 0.9; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.7);">— ${escapeHtml(p.cited)}</div>`
        : '';
      return `\n\n<div style="${container}"><div style="${contentStyle}">${escapeHtml(content.trim())}</div>${citation}</div>\n\n`;
    });

    // Handle [WNOTE | Cited='...']...[END WNOTE] — work note (parity with
    // GNewViewer .work-note styling), markdown parsed inside.
    processed = processed.replace(/\[WNOTE\s*\|([^\]]*)\]([\s\S]*?)\[END\s+WNOTE\]/gi, (_, style, text) => {
      const { cited, styles } = parseQuoteParams(style);
      const cite = cited !== 'Unknown'
        ? `<cite style="display: block; text-align: right; font-style: normal; color: #666; margin-top: 0.5em;">— ${escapeHtml(cited)}</cite>`
        : '';
      return `\n\n<div style="background-color: #ffd580; color: #333; font-size: 14px; font-family: 'Courier New', Courier, monospace; font-weight: bold; padding: 10px; margin: 10px 0; border-left: 5px solid #ccc; border-radius: 4px;${styles ? ' ' + styles + ';' : ''}">\n\n${text}\n\n${cite}</div>\n\n`;
    });

    // Handle [COMMENT | author: '...'; <css>]...[END COMMENT] — author-
    // attributed comment block (parity with GNewViewer .comment-block).
    processed = processed.replace(/\[COMMENT\s*\|([^\]]*)\]([\s\S]*?)\[END\s+COMMENT\]/gi, (_, style, text) => {
      let author = '';
      let css = '';
      style.split(';').forEach((s: string) => {
        const idx = s.indexOf(':');
        if (idx === -1) return;
        const k = s.slice(0, idx).trim();
        const v = s.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!k || !v) return;
        if (k.toLowerCase() === 'author') author = v;
        else css += `${k}: ${v}; `;
      });
      const authorHtml = author
        ? `<div style="font-weight: bold; margin-bottom: 0.5em; color: #888; font-size: 0.93em;">${escapeHtml(author)}</div>`
        : '';
      return `\n\n<div style="border-left: 4px solid #ccc; margin: 1.5em 0; padding: 0.75em 1em; font-size: 0.97em; background: #464545; color: #cfcaca; border-radius: 4px; ${css}">${authorHtml}\n\n${text}\n\n</div>\n\n`;
    });

    // Handle ![Header-N|styles](url) — full-width banner image (parity with
    // GNewViewer .header-image-container). Does not consume following text.
    processed = processed.replace(/!\[Header(?:-(\d+))?\|(.+?)\]\((.+?)\)/gi, (_, _n, styles, url) => {
      const getStyle = (key: string, fallback: string) => {
        const found = styles.match(new RegExp(key + `: *['"]?([^;'"]+)['"]?`, 'i'));
        return found ? found[1].trim() : fallback;
      };
      let height = getStyle('height', 'auto');
      if (/^\d+$/.test(height)) height += 'px';
      const objectFit = getStyle('object-fit', 'cover');
      const objectPosition = getStyle('object-position', 'center');
      return `\n\n<div style="width: 100%; max-width: 100%; margin: 0 auto 20px; overflow: hidden;"><img src="${url.trim()}" alt="Header Image" style="width: 100%; max-width: 100%; height: ${height}; object-fit: ${objectFit}; object-position: ${objectPosition}; display: block; border-radius: 8px; margin: 0;" /></div>\n\n`;
    });

    // Handle [SECTION | background-color:'...'; color:'...'; text-align:'...'; ...]...[END SECTION]
    processed = processed.replace(/\[SECTION\s*\|([^\]]*)\]([\s\S]*?)\[END SECTION\]/gi, (_, styles, text) => {
      let css = '';
      styles.split(';').forEach((s: string) => {
        const idx = s.indexOf(':');
        if (idx === -1) return;
        const k = s.slice(0, idx).trim();
        const v = s.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!k || !v) return;
        css += `${k}: ${v}; `;
      });
      return `\n\n<div class="p-10 my-8 rounded-3xl shadow-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50" style="${css}"><div class="break-words">\n\n${text}\n\n</div></div>\n\n`;
    });

    // Handle [FANCY | font-size:...; color:...; background-image:url('...')]...[END FANCY]
    processed = processed.replace(/\[FANCY\s*\|\s*([\s\S]*?)\]([\s\S]*?)\[END FANCY\]/gi, (_, styles, text) => {
      const styleObj: Record<string, string> = {};
      styles.split(';').forEach((s: string) => {
        const trimmed = s.trim();
        if (!trimmed) return;
        
        const firstColonIndex = trimmed.indexOf(':');
        if (firstColonIndex === -1) return;
        
        const key = trimmed.substring(0, firstColonIndex).trim().toLowerCase();
        const value = trimmed.substring(firstColonIndex + 1).trim();
        
        if (key && value) {
          const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          styleObj[camelKey] = value;
        }
      });

      const hasBgImage = !!styleObj.backgroundImage;
      const styleString = Object.entries(styleObj).map(([k, v]) => `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}: ${v}`).join('; ');

      if (hasBgImage) {
        return `\n\n<div class="p-12 my-10 rounded-[2.5rem] bg-cover bg-center flex flex-col justify-center items-center text-center min-h-[400px] relative overflow-hidden shadow-2xl border border-white/10" style="${styleString}"><div class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div><div class="relative z-10 w-full max-w-4xl mx-auto p-12 rounded-[2rem] prose-invert drop-shadow-2xl"><div class="text-white break-words overflow-wrap-anywhere">\n\n${text}\n\n</div></div></div>\n\n`;
      } else {
        // Simple styled container for cases like large characters or highlighted text
        return `\n\n<div class="p-8 my-6 rounded-3xl flex flex-col justify-center items-center text-center relative overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50" style="${styleString}"><div class="break-words overflow-wrap-anywhere">\n\n${text}\n\n</div></div>\n\n`;
      }
    });

    return processed;
  }

  const processedInfo = processContent(node.info, node.commentaries);

  // Extract used commentaries in order of appearance
  const usedCommentaries: any[] = [];
  const commentaryRegex = /\[COMMENTARY \| id='(.*?)'\]/g;
  let match;
  while ((match = commentaryRegex.exec(node.info)) !== null) {
    const comm = node.commentaries?.find(c => c.id === match![1]);
    if (comm && !usedCommentaries.find(c => c.id === comm.id)) {
      usedCommentaries.push(comm);
    }
  }

  // A markdown image with its credit caption and (editor) button underneath.
  const WithCredit = ({ src, children }: { src?: string; children: React.ReactNode }) => {
    const block = src ? creditBlock(src) : '';
    if (!block) return <>{children}</>;
    return (
      <span style={{ display: 'block' }}>
        {children}
        <span style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: block }} />
      </span>
    );
  };

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert" onClickCapture={editable ? onCreditClick : undefined}>
      {creditUrl && (
        <ImageCreditModal
          imageUrl={creditUrl}
          current={(attributions[creditUrl] as ImageAttribution) || null}
          onSave={(a) => writeCredit(creditUrl, a)}
          onRemove={() => writeCredit(creditUrl, null)}
          onClose={() => setCreditUrl(null)}
        />
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          img: ({ node, ...props }) => {
            const alt = props.alt || '';
            const [label, stylesStr] = alt.split('|');
            
            if (stylesStr) {
              const styleObj: Record<string, string> = {};
              stylesStr.split(';').forEach(s => {
                const [key, value] = s.split(':').map(x => x.trim());
                if (key && value) {
                  const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                  styleObj[camelKey] = value;
                }
              });
              return <WithCredit src={props.src}><img {...props} alt={label} style={styleObj} className="rounded-xl shadow-sm" /></WithCredit>;
            }

            return <WithCredit src={props.src}><img {...props} className="rounded-xl shadow-sm" /></WithCredit>;
          }
        }}
      >
        {processedInfo}
      </ReactMarkdown>

      {usedCommentaries.length > 0 && (
        <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Footnotes</h4>
          <div className="space-y-3">
            {usedCommentaries.map((comm, idx) => {
              const year = new Date(comm.createdAt).getFullYear();
              // APA-ish style: Håve, T. A. (2026). Commentary text. (TAH)
              return (
                <div key={comm.id} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">{idx + 1}.</span>
                  Håve, T. A. ({year}). {comm.text} ({comm.initials})
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
