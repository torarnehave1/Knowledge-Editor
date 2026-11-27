import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import NodeRenderer from './NodeRenderer';
import { GraphMetadata, Node } from '../types';
import { layoutMilestonePlan, MP_LANES, MP_TYPES, type MpEdge, type MpPlan } from '../lib/milestonePlan';

// Milestone plan: a third way to show a graph in /view, switched on with &layout=milepael in the
// address (the same pattern as &layout=forside, FrontPageView). Only then, never by itself
// (Tor Arne, 2026-11-27, spec graph 78b7ae36-9159-494b-bd33-7124ee28db33). It reads the graph and
// changes nothing. The lanes, rows and codes come from lib/milestonePlan.ts, Garnet's rules; the
// look follows Garnet's drawMilestonePlan: a lane each for P, S and O with a coloured head, the
// start above and the end below spanning the lanes, a solid arrow within a lane, a dashed one
// across lanes, a thin line to and from the start and the end, a reached milestone filled with its
// lane's colour. Descriptions render as fulltext markdown. App.tsx checks the plan first (checkMilestonePlan) and falls back to the standard
// view when it has more than one start or end, or its edges go in a ring.

interface MilestoneViewProps {
  metadata?: Partial<GraphMetadata>;
  nodes: Node[];
  edges: MpEdge[];
}

// Geometry in SVG units (the drawing scales to the page width): a lane's width, a box's share of
// it, a row's step, a box's height, and the lane heads above the first row.
const COL = 250;
const BOX_W = COL * 0.84;
const SPAN_W = COL * 1.7;
const ROW = 150;
const BOX_H = 118;
const SPAN_H = BOX_H * 0.8;
const HEAD = 64;
const TOP = HEAD + 14;
const WIDTH = COL * MP_LANES.length;
const LINE = '#94a3b8';

interface Box {
  left: number;
  top: number;
  w: number;
  h: number;
}

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
// The date of a milestone or a plan, under whichever name the graph uses.
const dateOf = (m?: Record<string, any>) => str(m?.dato) || str(m?.date) || str(m?.frist);

// Where each box stands. Milestones in the same lane and row are parallel (Garnet's rule), but
// Garnet draws them on top of each other; here they stack inside the row, ordered by code, and the
// row grows to its fullest lane. Returns the boxes and the drawing's height.
const STACK = 14;
function placeBoxes(plan: MpPlan): { boxes: Record<string, Box>; height: number } {
  const groups = new Map<string, string[]>();
  for (const [id, it] of Object.entries(plan.items)) {
    const k = `${it.row}:${it.lane}`;
    const g = groups.get(k);
    if (g) g.push(id);
    else groups.set(k, [id]);
  }
  const num = (id: string) => Number(plan.items[id].code.slice(1)) || 0;
  for (const g of groups.values()) g.sort((a, b) => num(a) - num(b));
  const slots: number[] = new Array(plan.rows).fill(1);
  for (const [k, g] of groups) {
    const r = Number(k.split(':')[0]);
    slots[r] = Math.max(slots[r], g.length);
  }
  const rowTop: number[] = [];
  let y = TOP;
  for (let r = 0; r < plan.rows; r++) {
    rowTop[r] = y;
    y += slots[r] * BOX_H + (slots[r] - 1) * STACK + (ROW - BOX_H);
  }
  const boxes: Record<string, Box> = {};
  for (const g of groups.values()) {
    g.forEach((id, i) => {
      const it = plan.items[id];
      const span = it.lane < 0;
      const w = span ? SPAN_W : BOX_W;
      const h = span ? SPAN_H : BOX_H;
      const left = span ? WIDTH / 2 - w / 2 : it.lane * COL + (COL - w) / 2;
      boxes[id] = { left, top: rowTop[it.row] + i * (BOX_H + STACK), w, h };
    });
  }
  return { boxes, height: y - (ROW - BOX_H) + 20 };
}

function Facts({ m, className }: { m?: Record<string, any>; className?: string }) {
  const facts: Array<[string, string]> = [
    ['Prosjekt', str(m?.prosjekt)],
    ['Dato', dateOf(m)],
    ['Ansvarlig', str(m?.ansvarlig)],
    ['Godkjenner', str(m?.godkjenner)],
  ];
  const shown = facts.filter(([, v]) => v);
  if (!shown.length) return null;
  return (
    <dl className={className}>
      {shown.map(([k, v]) => (
        <div key={k} className="flex gap-1.5">
          <dt className="font-semibold">{k}:</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function MilestoneView({ metadata, nodes, edges }: MilestoneViewProps) {
  const plan = useMemo(() => layoutMilestonePlan(nodes, edges), [nodes, edges]);
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const open = openId ? byId.get(openId) : undefined;

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  if (!plan) return null;
  const start = nodes.find((n) => plan.items[n.id]?.kind === 'start');
  const others = nodes.filter((n) => n.visible && !MP_TYPES.has(n.type));
  const { boxes, height } = placeBoxes(plan);
  const placed = nodes.filter((n) => plan.items[n.id]);
  const msCount = placed.filter((n) => plan.items[n.id].kind === 'ms').length;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto px-4 py-8 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          {metadata?.title && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{metadata.title}</p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold">{start?.label || 'Milepælsplan'}</h1>
          <Facts
            m={start?.metadata}
            className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400"
          />
          {start?.info && (
            <div className="max-w-2xl mx-auto text-left">
              <NodeRenderer node={{ ...start, type: 'fulltext' }} />
            </div>
          )}
        </header>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-zinc-500">
          <span>{msCount} milepæler · {plan.deps.length} avhengigheter</span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke={LINE} strokeWidth="2" /></svg>
            innen et løp
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke={LINE} strokeWidth="2" strokeDasharray="6 4" /></svg>
            mellom løp
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: MP_LANES[0].color }} />
            fylt = nådd
          </span>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${height}`}
            className="w-full min-w-[680px]"
            role="img"
            aria-label={`Milepælsplan: ${start?.label || metadata?.title || ''}`}
          >
            <defs>
              <marker id="mp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={LINE} />
              </marker>
              <marker id="mp-arrow-thin" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={LINE} />
              </marker>
            </defs>

            {/* The lanes: a pale field and a coloured head with the letter and the name. */}
            {MP_LANES.map((l, i) => (
              <g key={l.key}>
                <rect x={i * COL + 3} y={0} width={COL - 6} height={height} rx={10} fill={l.color} opacity={0.1} />
                <rect x={i * COL + 3} y={0} width={COL - 6} height={HEAD - 8} rx={10} fill={l.color} />
                <text x={i * COL + COL / 2} y={24} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700">{l.key}</text>
                <text x={i * COL + COL / 2} y={44} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">{l.name}</text>
              </g>
            ))}

            {/* The dependencies, behind the boxes. */}
            {plan.deps.map((dep) => {
              const A = boxes[dep.s];
              const B = boxes[dep.t];
              const ia = plan.items[dep.s];
              const ib = plan.items[dep.t];
              const key = `${dep.s}->${dep.t}`;
              if (dep.kind === 'x') {
                const right = ib.lane > ia.lane;
                const x1 = right ? A.left + A.w : A.left;
                const y1 = A.top + A.h * 0.62;
                const x2 = right ? B.left + B.w * 0.12 : B.left + B.w - B.w * 0.12;
                const y2 = B.top - 1;
                const d = `M${x1},${y1} C${x1 + (right ? 1 : -1) * COL * 0.22},${y1 + 4} ${x2},${y2 - ROW * 0.45} ${x2},${y2}`;
                return <path key={key} d={d} fill="none" stroke={LINE} strokeWidth="1.8" strokeDasharray="7 5" markerEnd="url(#mp-arrow)" />;
              }
              const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
              let x1 = A.left + A.w / 2;
              let x2 = B.left + B.w / 2;
              if (dep.kind === 'end') {
                if (ia.lane < 0) x1 = clamp(x2, A.left + 14, A.left + A.w - 14);
                if (ib.lane < 0) x2 = clamp(A.left + A.w / 2, B.left + 14, B.left + B.w - 14);
              }
              const thin = dep.kind === 'end';
              // A straight line that would pass behind another box (a milestone stacked in the
              // same lane) would look like a dependency it is not. Such a line runs instead down
              // the lane's left margin and enters the box from the side.
              const y1s = A.top + A.h;
              const y2s = B.top - 1;
              const hidden = Object.entries(boxes).some(
                ([id, o]) =>
                  id !== dep.s && id !== dep.t &&
                  Math.min(x1, x2) < o.left + o.w && Math.max(x1, x2) > o.left &&
                  o.top < y2s && o.top + o.h > y1s,
              );
              if (hidden) {
                const lane = ib.lane >= 0 ? ib.lane : ia.lane;
                const gx = lane * COL + (COL - BOX_W) / 2 - 9;
                const pts: Array<[number, number]> = [];
                if (ia.lane < 0) {
                  const sx = clamp(gx, A.left + 14, A.left + A.w - 14);
                  pts.push([sx, y1s], [sx, y1s + 16], [gx, y1s + 16]);
                } else {
                  pts.push([A.left, A.top + A.h / 2], [gx, A.top + A.h / 2]);
                }
                if (ib.lane < 0) {
                  const tx = clamp(gx, B.left + 14, B.left + B.w - 14);
                  pts.push([gx, y2s - 16], [tx, y2s - 16], [tx, y2s]);
                } else {
                  const ty = B.top + B.h / 2;
                  pts.push([gx, ty], [B.left - 1, ty]);
                }
                return (
                  <polyline
                    key={key}
                    points={pts.map((p) => p.join(',')).join(' ')}
                    fill="none"
                    stroke={LINE}
                    strokeWidth={thin ? 1 : 2}
                    strokeLinejoin="round"
                    opacity={thin ? 0.7 : 1}
                    markerEnd={thin ? 'url(#mp-arrow-thin)' : 'url(#mp-arrow)'}
                  />
                );
              }
              return (
                <line
                  key={key}
                  x1={x1}
                  y1={A.top + A.h}
                  x2={x2}
                  y2={B.top - 1}
                  stroke={LINE}
                  strokeWidth={thin ? 1 : 2}
                  opacity={thin ? 0.7 : 1}
                  markerEnd={thin ? 'url(#mp-arrow-thin)' : 'url(#mp-arrow)'}
                />
              );
            })}

            {/* The boxes. Text sits in HTML inside the SVG so it wraps. */}
            {placed.map((n) => {
              const it = plan.items[n.id];
              const b = boxes[n.id];
              const span = it.lane < 0;
              const col = span ? undefined : MP_LANES[it.lane].color;
              const date = dateOf(n.metadata);
              const who = [str(n.metadata?.ansvarlig), str(n.metadata?.godkjenner) && `godkj. ${str(n.metadata?.godkjenner)}`, date]
                .filter(Boolean)
                .join(' · ');
              return (
                <foreignObject key={n.id} x={b.left} y={b.top} width={b.w} height={b.h}>
                  <button
                    type="button"
                    onClick={() => setOpenId(n.id)}
                    title={`${n.label} — ${it.done ? 'nådd' : 'ikke nådd'}`}
                    className={
                      'w-full h-full rounded-xl text-left px-3 py-2 flex flex-col cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ' +
                      (span
                        ? 'bg-slate-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 items-center justify-center text-center border border-slate-300 dark:border-zinc-700'
                        : it.done
                          ? 'text-white border-[3px]'
                          : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-[3px]')
                    }
                    style={col ? { borderColor: col, ...(it.done ? { background: col } : {}) } : undefined}
                  >
                    {span ? (
                      <>
                        <span className="text-[15px] font-bold leading-tight line-clamp-2">{n.label}</span>
                        <span className="text-[11px] mt-1 text-zinc-500 dark:text-zinc-400">
                          {it.kind === 'start' ? 'Start' : 'Slutt'}
                          {it.done ? ' · nådd' : ''}
                          {date ? ` · ${date}` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center justify-between text-[11px] font-bold" style={it.done ? undefined : { color: col }}>
                          <span>{it.code}</span>
                          <span>{it.done ? '✓ nådd' : 'ikke nådd'}</span>
                        </span>
                        <span className="text-[13px] font-medium leading-snug line-clamp-3 mt-0.5">{n.label}</span>
                        {who && (
                          <span className={'mt-auto text-[11px] truncate ' + (it.done ? 'text-white/85' : 'text-zinc-500 dark:text-zinc-400')}>{who}</span>
                        )}
                      </>
                    )}
                  </button>
                </foreignObject>
              );
            })}
          </svg>
        </div>

        {others.length > 0 && (
          <div className="space-y-8 pt-4">
            {others.map((node) => (
              <div key={node.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                <h3 className="font-bold tracking-tight mb-6">{node.label || 'Untitled Node'}</h3>
                <NodeRenderer node={node} />
              </div>
            ))}
          </div>
        )}
      </div>

      {open && plan.items[open.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={open.label}
            className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Lukk"
            >
              <X size={18} />
            </button>
            {(() => {
              const it = plan.items[open.id];
              const lane = it.lane >= 0 ? MP_LANES[it.lane] : null;
              return (
                <p className="text-xs font-bold uppercase tracking-[0.14em] mb-2" style={lane ? { color: lane.color } : undefined}>
                  {lane ? `${it.code} · ${lane.name}` : it.kind === 'start' ? 'Start' : 'Slutt'} · {it.done ? 'nådd' : 'ikke nådd'}
                </p>
              );
            })()}
            <h2 className="text-xl font-bold pr-8 mb-3">{open.label}</h2>
            <Facts m={open.metadata} className="text-sm text-zinc-600 dark:text-zinc-400 space-y-0.5 mb-4" />
            {(() => {
              const name = (id: string) => {
                const it = plan.items[id];
                return (it.code ? `${it.code} ` : '') + (byId.get(id)?.label || id);
              };
              const before = plan.deps.filter((d) => d.t === open.id).map((d) => d.s);
              const after = plan.deps.filter((d) => d.s === open.id).map((d) => d.t);
              if (!before.length && !after.length) return null;
              return (
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 mb-4">
                  {before.length > 0 && <p><span className="font-semibold">Avhenger av:</span> {before.map(name).join(' · ')}</p>}
                  {after.length > 0 && <p><span className="font-semibold">Fører til:</span> {after.map(name).join(' · ')}</p>}
                </div>
              );
            })()}
            {open.info ? <NodeRenderer node={{ ...open, type: 'fulltext' }} /> : <p className="text-sm text-zinc-500">Ingen beskrivelse.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
