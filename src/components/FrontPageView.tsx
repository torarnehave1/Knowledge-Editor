import NodeRenderer from './NodeRenderer';
import { GraphMetadata, Node } from '../types';

// Front page: a second way to show a graph in /view, switched on with &layout=forside
// (or &layout=frontpage) in the address. It reads the same nodes as the standard view and
// changes nothing in the graph:
//   - every "### Heading" section in a fulltext node becomes a story card
//   - the first story is the lead story
//   - the text before the first heading in the first fulltext node (a greeting, an editorial)
//     sits beside the lead story, and a ![Header|…](url) image there becomes the masthead image
//   - every other node (html-node, video …) is a full-width panel, in graph order
// Story bodies are drawn by NodeRenderer, so quotes, side images and links behave as in the
// standard view. Without the parameter nothing here runs.

interface FrontPageViewProps {
  metadata?: Partial<GraphMetadata>;
  nodes: Node[];
}

interface Story {
  key: string;
  title: string;
  body: string;
  node: Node;
}

type Block =
  | { kind: 'stories'; key: string; stories: Story[] }
  | { kind: 'text'; key: string; node: Node; body: string }
  | { kind: 'panel'; key: string; node: Node };

const SERIF = { fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif' };
const HEADER_IMAGE = /^!\[Header[^\]]*\]\(([^)\s]+)\)[ \t]*$/im;

// "### Heading" only: "####" and deeper stay inside the story they belong to.
function splitStories(info: string): { pre: string; stories: Array<{ title: string; body: string }> } {
  const parts = info.split(/^###(?!#)[ \t]+/m);
  const pre = parts[0] || '';
  const stories = parts.slice(1).map((part) => {
    const newline = part.indexOf('\n');
    const title = (newline === -1 ? part : part.slice(0, newline)).trim();
    const body = newline === -1 ? '' : part.slice(newline + 1).trim();
    return { title, body };
  });
  return { pre, stories };
}

// A story gets two columns when it carries an image or a quote, or is long.
const isWide = (story: Story) =>
  /!\[[^\]]*\]\(/.test(story.body) || /\[QUOTE/i.test(story.body) || story.body.length > 700;

function buildFrontPage(nodes: Node[]) {
  let mastheadImage: string | null = null;
  let editorial: { node: Node; body: string } | null = null;
  const blocks: Block[] = [];
  let seenFulltext = false;

  const pushStories = (stories: Story[]) => {
    if (stories.length === 0) return;
    const last = blocks[blocks.length - 1];
    if (last && last.kind === 'stories') last.stories.push(...stories);
    else blocks.push({ kind: 'stories', key: `stories-${blocks.length}`, stories: [...stories] });
  };

  for (const node of nodes) {
    if (node.type !== 'fulltext') {
      blocks.push({ kind: 'panel', key: `panel-${node.id}`, node });
      continue;
    }
    const { pre, stories } = splitStories(node.info || '');
    let preText = pre;
    if (!seenFulltext) {
      const header = preText.match(HEADER_IMAGE);
      if (header) {
        mastheadImage = header[1];
        preText = preText.replace(HEADER_IMAGE, '');
      }
    }
    preText = preText.trim();
    if (preText) {
      if (!seenFulltext && stories.length > 0) editorial = { node, body: preText };
      else blocks.push({ kind: 'text', key: `text-${node.id}`, node, body: preText });
    }
    seenFulltext = true;
    pushStories(stories.map((s, i) => ({ key: `${node.id}::${i}`, title: s.title, body: s.body, node })));
  }

  // The lead is the first story in the graph. With an editorial beside it, the next two
  // stories (four when the editorial is long) fill the space under the lead, so the two
  // sides are closer in height.
  let lead: Story | null = null;
  let secondary: Story[] = [];
  const firstStories = blocks.find((b) => b.kind === 'stories') as Extract<Block, { kind: 'stories' }> | undefined;
  if (firstStories) {
    lead = firstStories.stories.shift() || null;
    if (editorial) secondary = firstStories.stories.splice(0, editorial.body.length > 1200 ? 4 : 2);
  }

  const remaining = blocks.filter((b) => b.kind !== 'stories' || b.stories.length > 0);
  let closingKey: string | null = null;
  for (let i = remaining.length - 1; i >= 0; i--) {
    const block = remaining[i];
    if (block.kind === 'stories') {
      closingKey = block.stories[block.stories.length - 1].key;
      break;
    }
  }

  return { mastheadImage, editorial, lead, secondary, blocks: remaining, closingKey };
}

function StoryBody({ story, className }: { story: Story; className?: string }) {
  if (!story.body) return null;
  return (
    <div className={className}>
      <NodeRenderer node={{ ...story.node, id: story.key, info: story.body }} />
    </div>
  );
}

const BODY = '[&_.prose]:text-[0.95rem] [&_.prose]:leading-relaxed [&_.prose>*:first-child]:mt-0 [&_.prose>*:last-child]:mb-0';
const RULE = 'border-t-[3px] border-zinc-900 dark:border-zinc-100 pt-3';

export default function FrontPageView({ metadata, nodes }: FrontPageViewProps) {
  const { mastheadImage, editorial, lead, secondary, blocks, closingKey } = buildFrontPage(nodes);
  const title = metadata?.title || 'Knowledge Graph';

  return (
    <div className="min-h-screen bg-[#fbfaf7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-6xl mx-auto">
        <header className="text-center border-b-4 border-double border-zinc-900 dark:border-zinc-100 pb-4 mb-6">
          {metadata?.metaArea && (
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400 mb-2">
              {metadata.metaArea.replace(/#/g, '').trim().split(/\s+/).join(' · ')}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight" style={SERIF}>{title}</h1>
        </header>

        {mastheadImage && (
          <img src={mastheadImage} alt="" className="w-full h-auto rounded-lg mb-8" />
        )}

        {(lead || editorial) && (
          <section className={editorial && lead ? 'grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10' : 'mb-10'}>
            {lead && (
              <div className={editorial ? 'lg:col-span-2' : ''}>
                <article>
                  <h2 className="text-3xl md:text-[2.75rem] font-bold leading-[1.1] mb-4" style={SERIF}>{lead.title}</h2>
                  <StoryBody story={lead} className="[&_.prose]:text-lg [&_.prose]:leading-relaxed [&_.prose>*:first-child]:mt-0" />
                </article>
                {secondary.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    {secondary.map((story) => (
                      <article key={story.key} className={RULE}>
                        <h3 className="text-xl font-bold leading-snug mb-2" style={SERIF}>{story.title}</h3>
                        <StoryBody story={story} className={BODY} />
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
            {editorial && (
              <aside className="rounded-xl bg-amber-50 dark:bg-zinc-900 border border-amber-200/70 dark:border-zinc-800 p-5 md:p-6 self-start">
                <div className={BODY}>
                  <NodeRenderer node={{ ...editorial.node, id: `${editorial.node.id}::editorial`, info: editorial.body }} />
                </div>
              </aside>
            )}
          </section>
        )}

        {blocks.map((block) => {
          if (block.kind === 'panel') {
            return (
              <section key={block.key} className="mb-10">
                {block.node.label && (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400 mb-3">
                    {block.node.label}
                  </p>
                )}
                <NodeRenderer node={block.node} />
              </section>
            );
          }
          if (block.kind === 'text') {
            return (
              <section key={block.key} className={`mb-10 ${BODY}`}>
                <NodeRenderer node={{ ...block.node, id: block.key, info: block.body }} />
              </section>
            );
          }
          return (
            <section key={block.key} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10 [grid-auto-flow:dense]">
              {block.stories.map((story) => {
                const closing = story.key === closingKey;
                const span = closing ? 'md:col-span-2 lg:col-span-3' : isWide(story) ? 'md:col-span-2' : '';
                return (
                  <article key={story.key} className={`${RULE} min-w-0 ${span}`}>
                    <h3 className={`${closing ? 'text-2xl md:text-3xl' : 'text-xl'} font-bold leading-snug mb-2`} style={SERIF}>
                      {story.title}
                    </h3>
                    <StoryBody story={story} className={BODY} />
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
