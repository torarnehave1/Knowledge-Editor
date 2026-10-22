import type { Node } from '../types';

/**
 * Reading order of a graph's nodes, the same rule every viewer uses (GNewViewer, graph-portfolio,
 * /public-graph, seo-worker, MCP reorder_nodes): by `order`, a node without one falling back to
 * its array position (index + 1). Stable on ties.
 */
export function sortNodesByOrder<T extends Pick<Node, 'order'>>(nodes: T[]): T[] {
  return nodes
    .map((n, i) => ({ n, key: Number(n?.order) > 0 ? Number(n.order) : i + 1, i }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((x) => x.n);
}

/**
 * After this editor moves nodes (which it does by reordering the array), write the new positions
 * into `order` as well. Otherwise the viewers that sort by `order` would keep the old order.
 */
export function renumberNodes<T extends Pick<Node, 'order'>>(nodes: T[]): T[] {
  return nodes.map((n, i) => (n.order === i + 1 ? n : { ...n, order: i + 1 }));
}
