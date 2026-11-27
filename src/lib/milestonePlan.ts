// Milestone plans with PSO result paths, the same rules as Garnet (torarnehave1/garnet,
// src/lib/milestonePlan.ts, commit b876408, 2026-11-26), so /view?…&layout=milepael and the map
// in Garnet place every milestone in the same lane and row. Keep the two in step.
//
//   milepael-start   the start and header: "Avtale inngått" (exactly one per graph)
//   milepael-p       a milestone in the P path (Personutvikling)
//   milepael-s       a milestone in the S path (Systemutvikling)
//   milepael-o       a milestone in the O path (Organisasjonsutvikling)
//   milepael-slutt   the end: "Levert i henhold til avtale"
//
// The edges are logical dependencies: the target cannot be reached before the source. A
// milestone's row is one below the latest of those it depends on (the longest path from the
// start), so milestones with no dependency between them share a row. An edge between two
// milestones of the same type is drawn solid, between two types dashed; an edge to or from the
// start or the end is a thin line.

import type { Node } from '../types';

export const MP_START = 'milepael-start';
export const MP_END = 'milepael-slutt';
export const MP_LANES = [
  { type: 'milepael-p', key: 'P', name: 'Personutvikling', color: '#2e6f8e' },
  { type: 'milepael-s', key: 'S', name: 'Systemutvikling', color: '#c77f3a' },
  { type: 'milepael-o', key: 'O', name: 'Organisasjonsutvikling', color: '#5b8a5f' },
] as const;
export const MP_TYPES = new Set<string>([MP_START, MP_END, ...MP_LANES.map((l) => l.type)]);

export interface MpEdge {
  source: string;
  target: string;
}
export type MpKind = 'start' | 'ms' | 'end';
export type MpDep = 'in' | 'x' | 'end';
export interface MpPlan {
  rows: number; // rows from the start (row 0) to the end (the last row)
  // Each placed node: its lane (0 P, 1 S, 2 O; -1 for start and end, which span the lanes), its
  // row, what it is, its code (P1, S2 …), and whether it is reached.
  items: Record<string, { lane: number; row: number; kind: MpKind; code: string; done: boolean }>;
  deps: { s: string; t: string; kind: MpDep }[];
}

export const isReached = (v: unknown) =>
  typeof v === 'string' && /^(nådd|nadd|reached|done|ferdig)$/i.test(v.trim());

/** The layout of a milestone plan from its graph's nodes and edges; null without a start node. */
export function layoutMilestonePlan(nodes: Node[], edges: MpEdge[]): MpPlan | null {
  const kinds = new Map<string, { kind: MpKind; lane: number }>();
  for (const n of nodes) {
    if (n.type === MP_START) kinds.set(n.id, { kind: 'start', lane: -1 });
    else if (n.type === MP_END) kinds.set(n.id, { kind: 'end', lane: -1 });
    else {
      const lane = MP_LANES.findIndex((l) => l.type === n.type);
      if (lane >= 0) kinds.set(n.id, { kind: 'ms', lane });
    }
  }
  if (![...kinds.values()].some((k) => k.kind === 'start')) return null;
  const into = new Map<string, string[]>();
  const deps: MpPlan['deps'] = [];
  for (const e of edges) {
    const a = kinds.get(e.source);
    const b = kinds.get(e.target);
    if (!a || !b || e.source === e.target) continue;
    const l = into.get(e.target);
    if (l) l.push(e.source);
    else into.set(e.target, [e.source]);
    deps.push({ s: e.source, t: e.target, kind: a.kind !== 'ms' || b.kind !== 'ms' ? 'end' : a.lane === b.lane ? 'in' : 'x' });
  }
  // Row = the longest path from the start. A cycle is cut where it closes (checkMilestonePlan
  // refuses such a plan before it is drawn here).
  const row = new Map<string, number>();
  const busy = new Set<string>();
  const rowOf = (id: string): number => {
    const known = row.get(id);
    if (known !== undefined) return known;
    if (busy.has(id)) return 0;
    busy.add(id);
    const k = kinds.get(id)!;
    // A milestone that depends on nothing stands just under the start, never beside it.
    const r = k.kind === 'start' ? 0 : Math.max(1, ...(into.get(id) ?? []).map((s) => rowOf(s) + 1));
    busy.delete(id);
    row.set(id, r);
    return r;
  };
  for (const id of kinds.keys()) rowOf(id);
  // The start stays on top and the end at the bottom, whatever the edges say.
  let last = 0;
  for (const [id, k] of kinds) if (k.kind !== 'end') last = Math.max(last, k.kind === 'start' ? 0 : row.get(id)!);
  for (const [id, k] of kinds) {
    if (k.kind === 'start') row.set(id, 0);
    if (k.kind === 'end') row.set(id, last + 1);
  }
  // Codes in each lane follow the rows (and the graph's own order within a row): P1, P2 …
  const byNode = new Map(nodes.map((n, i) => [n.id, i]));
  const items: MpPlan['items'] = {};
  for (const [lane, l] of MP_LANES.entries()) {
    const ids = [...kinds].filter(([, k]) => k.kind === 'ms' && k.lane === lane).map(([id]) => id);
    ids.sort((a, b) => row.get(a)! - row.get(b)! || byNode.get(a)! - byNode.get(b)!);
    ids.forEach((id, i) => (items[id] = { lane, row: row.get(id)!, kind: 'ms', code: l.key + (i + 1), done: false }));
  }
  for (const [id, k] of kinds) if (k.kind !== 'ms') items[id] = { lane: -1, row: row.get(id)!, kind: k.kind, code: '', done: false };
  for (const n of nodes) if (items[n.id]) items[n.id].done = isReached(n.metadata?.status);
  return { rows: Math.max(...Object.values(items).map((x) => x.row)) + 1, items, deps };
}

/**
 * Whether a graph can be drawn as a milestone plan. 'none' when it is not one (no start node);
 * otherwise null when it can, or the reason it cannot (more than one start or end, or edges that
 * go in a ring) — /view then falls back to the standard view and says why.
 */
export function checkMilestonePlan(nodes: Node[], edges: MpEdge[]): 'none' | string | null {
  const starts = nodes.filter((n) => n.type === MP_START).length;
  const ends = nodes.filter((n) => n.type === MP_END).length;
  if (starts === 0) return 'none';
  if (starts > 1) return `Grafen har ${starts} startnoder (${MP_START}). En milepælsplan har nøyaktig én.`;
  if (ends > 1) return `Grafen har ${ends} sluttnoder (${MP_END}). En milepælsplan har høyst én.`;
  const ids = new Set(nodes.filter((n) => MP_TYPES.has(n.type)).map((n) => n.id));
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    if (e.source === e.target) return 'En pil går fra en milepæl til seg selv.';
    const l = out.get(e.source);
    if (l) l.push(e.target);
    else out.set(e.source, [e.target]);
  }
  // Depth-first search: an edge back to a node on the current path closes a ring.
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    state.set(id, 1);
    for (const t of out.get(id) ?? []) {
      const s = state.get(t);
      if (s === 1) return true;
      if (s === undefined && visit(t)) return true;
    }
    state.set(id, 2);
    return false;
  };
  for (const id of ids) if (!state.has(id) && visit(id)) return 'Pilene mellom milepælene går i ring, så rekkefølgen kan ikke regnes ut.';
  return null;
}
