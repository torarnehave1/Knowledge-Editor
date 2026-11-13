import type { Node } from '../types';

/**
 * Find the first usable image in the graph for the OG/social card.
 * Order: image nodes, IMAGEQUOTE backgrounds, markdown images, inline <img>,
 * then any node path that looks like an image. Mirrors extractGraphImage in
 * the seo-worker so editor preview and published page agree.
 */
export function findGraphImage(nodes: Node[]): string {
  const imageNode = nodes.find(n => n.type === 'image' && n.path);
  if (imageNode?.path) return imageNode.path;

  for (const node of nodes) {
    if (!node.info) continue;

    // [IMAGEQUOTE backgroundImage:'...' ...] - the picture lives in the params
    const quoteMatch = node.info.match(/\[IMAGEQUOTE\s*([^\]]*)\]/i);
    if (quoteMatch) {
      const bg = quoteMatch[1].match(/backgroundImage:\s*(?:'([^']*)'|"([^"]*)"|(\S+))/i);
      const url = bg ? (bg[1] || bg[2] || bg[3] || '') : '';
      if (/^https?:\/\//i.test(url)) return url;
    }

    const mdMatch = node.info.match(/!\[.*?\]\((.*?)\)/);
    if (mdMatch?.[1]) return mdMatch[1];

    const htmlMatch = node.info.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (htmlMatch?.[1]) return htmlMatch[1];
  }

  const anyImageNode = nodes.find(n => n.path && n.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$|picsum\.photos/i));
  return anyImageNode?.path || '';
}
