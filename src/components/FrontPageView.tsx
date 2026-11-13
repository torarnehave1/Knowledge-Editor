import NodeRenderer from './NodeRenderer';
import { GraphMetadata, Node } from '../types';

// Front page: a second way to show a graph in /view, switched on with &layout=forside
// (or &layout=frontpage) in the address. It reads the same nodes as the standard view and
// changes nothing in the graph. Without the parameter nothing here runs.
//
// Stories
//   Every "### Heading" section in a fulltext node is a story. The text before the first
//   heading in the first fulltext node is the editorial (a greeting from the editor), and a
//   ![Header|…](url) image there is the masthead image. Story bodies are drawn by
//   NodeRenderer, so quotes, images and links behave as in the standard view.
//
// Two layouts
//   1. Without a plan: stories in graph order, the first one as lead (SimpleFront).
//   2. With a plan: a hidden json-node in the same graph whose info is JSON with a
//      "frontpage" key places the stories (PlannedFront). Stories are named by the start of
//      their heading. A story the plan does not name is never dropped: it lands under
//      "more". The plan is layout only, the text stays in the fulltext nodes.
//
//   { "frontpage": {
//       "masthead":  { "title": "…", "left": "…", "right": "…" },
//       "lead":      { "label": "Hovedsak", "story": "Møte med IIBA", "follow": ["Verdenspulsen"] },
//       "editorial": { "label": "Lederen har ordet" },
//       "bands":     ["<node id>"],                      // non-fulltext nodes in full width
//       "corner":    { "label": "…", "stories": ["…"], "caption": "…", "color": "#3f8f3a" },
//       "beside":    ["…"],                              // stories beside the corner
//       "pullQuote": "…",                                // story whose first [QUOTE] is shown large
//       "columns":   [ { "groups": [ { "label": "…", "stories": ["…"],
//                        "dates": { "title": "…", "items": [["27. november", "Julemøte"]] } } ] } ],
//       "closing":   "…",
//       "more":      { "label": "Flere saker" }
//   } }

interface FrontPageViewProps {
  metadata?: Partial<GraphMetadata>;
  nodes: Node[]; // every node of the graph, hidden ones included (the plan node is hidden)
}

interface Story {
  key: string;
  title: string;
  body: string;
  node: Node;
}

interface PlanGroup {
  label?: string;
  stories?: string[];
  dates?: { title?: string; items?: Array<[string, string]> };
}

interface Plan {
  masthead?: { title?: string; left?: string; right?: string };
  lead?: { label?: string; story?: string; follow?: string[] };
  editorial?: { label?: string };
  bands?: string[];
  corner?: { label?: string; stories?: string[]; caption?: string; color?: string };
  beside?: string[];
  pullQuote?: string;
  columns?: Array<{ groups?: PlanGroup[] }>;
  closing?: string;
  more?: { label?: string };
}

const SERIF = { fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif' };
const HEADER_IMAGE = /^!\[Header[^\]]*\]\(([^)\s]+)\)[ \t]*$/im;
const QUOTE_BLOCK = /\[QUOTE\s*\|\s*Cited\s*=\s*['"]?(.*?)['"]?\]([\s\S]*?)\[END QUOTE\]/i;
const SIDE_IMAGE = /^!\[(?:Leftside|Rightside)[^\]]*\]\(([^)\s]+)\)[ \t]*\n?/im;

const BODY =
  '[&_.prose]:text-[0.95rem] [&_.prose]:leading-relaxed [&_.prose>*:first-child]:mt-0 [&_.prose>*:last-child]:mb-0';
const RULE = 'border-t-[3px] border-zinc-900 dark:border-zinc-100 pt-2';
const KICKER = 'text-[0.72rem] font-bold uppercase tracking-[0.16em]';
const PAGE =
  'min-h-screen bg-[#f3f5f2] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto px-4 py-6 md:px-7 md:py-8';

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

function findPlan(nodes: Node[]): Plan | null {
  for (const node of nodes) {
    if (node.type !== 'json-node' || !node.info) continue;
    try {
      const parsed = JSON.parse(node.info);
      if (parsed && typeof parsed.frontpage === 'object' && parsed.frontpage) return parsed.frontpage as Plan;
    } catch {
      // not JSON, so not a plan
    }
  }
  return null;
}

type Piece =
  | { kind: 'story'; story: Story }
  | { kind: 'text'; key: string; node: Node; body: string }
  | { kind: 'panel'; key: string; node: Node };

function readGraph(nodes: Node[]) {
  let mastheadImage: string | null = null;
  let editorial: { node: Node; body: string } | null = null;
  const pieces: Piece[] = [];
  let seenFulltext = false;

  for (const node of nodes) {
    if (!node.visible) continue;
    if (node.type !== 'fulltext') {
      pieces.push({ kind: 'panel', key: `panel-${node.id}`, node });
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
      else pieces.push({ kind: 'text', key: `text-${node.id}`, node, body: preText });
    }
    seenFulltext = true;
    stories.forEach((s, i) =>
      pieces.push({ kind: 'story', story: { key: `${node.id}::${i}`, title: s.title, body: s.body, node } }),
    );
  }
  return { mastheadImage, editorial, pieces };
}

function Body({ story, body, className }: { story: Story; body?: string; className?: string }) {
  const text = body ?? story.body;
  if (!text.trim()) return null;
  return (
    <div className={className ?? BODY}>
      <NodeRenderer node={{ ...story.node, id: story.key, info: text }} />
    </div>
  );
}

function StoryCard({ story, body, large }: { story: Story; body?: string; large?: boolean }) {
  return (
    <article className={`${RULE} min-w-0`}>
      <h3 className={`${large ? 'text-2xl md:text-3xl' : 'text-xl'} font-bold leading-snug mb-2 [text-wrap:balance]`} style={SERIF}>
        {story.title}
      </h3>
      <Body story={story} body={body} />
    </article>
  );
}

function Masthead({ title, left, right, image }: { title: string; left?: string; right?: string; image: string | null }) {
  return (
    <>
      <header className="border-b-4 border-double border-zinc-900 dark:border-zinc-100 pb-2 mb-6">
        {(left || right) && (
          <div className={`flex flex-wrap justify-between gap-3 border-b border-zinc-900 dark:border-zinc-100 pb-1.5 text-zinc-500 dark:text-zinc-400 ${KICKER}`}>
            <span>{left}</span>
            <span>{right}</span>
          </div>
        )}
        <h1 className="text-4xl md:text-6xl font-bold leading-none text-center py-3 [text-wrap:balance]" style={SERIF}>
          {title}
        </h1>
      </header>
      {image && <img src={image} alt="" className="w-full h-auto rounded mb-8" />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Layout 1: no plan. Stories in graph order, the first one as lead.
// ---------------------------------------------------------------------------
const isWide = (story: Story) =>
  /!\[[^\]]*\]\(/.test(story.body) || /\[QUOTE/i.test(story.body) || story.body.length > 700;

function SimpleFront({ metadata, nodes }: FrontPageViewProps) {
  const { mastheadImage, editorial, pieces } = readGraph(nodes);
  const rest = [...pieces];
  const leadIndex = rest.findIndex((p) => p.kind === 'story');
  const lead = leadIndex >= 0 ? (rest.splice(leadIndex, 1)[0] as Extract<Piece, { kind: 'story' }>).story : null;
  // With an editorial beside the lead, the next stories fill the space under the lead.
  const secondary: Story[] = [];
  if (lead && editorial) {
    const wanted = editorial.body.length > 1200 ? 4 : 2;
    while (secondary.length < wanted && rest[leadIndex] && rest[leadIndex].kind === 'story') {
      secondary.push((rest.splice(leadIndex, 1)[0] as Extract<Piece, { kind: 'story' }>).story);
    }
  }
  const lastStory = [...rest].reverse().find((p) => p.kind === 'story') as Extract<Piece, { kind: 'story' }> | undefined;

  // Consecutive stories share one grid; panels and loose text break it.
  const groups: Array<Piece | { kind: 'grid'; key: string; stories: Story[] }> = [];
  for (const piece of rest) {
    const last = groups[groups.length - 1];
    if (piece.kind !== 'story') groups.push(piece);
    else if (last && last.kind === 'grid') last.stories.push(piece.story);
    else groups.push({ kind: 'grid', key: `grid-${groups.length}`, stories: [piece.story] });
  }

  return (
    <div className={PAGE}>
      <div className="max-w-6xl mx-auto">
        <Masthead title={metadata?.title || 'Knowledge Graph'} image={mastheadImage} />
        {(lead || editorial) && (
          <section className={editorial && lead ? 'grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10' : 'mb-10'}>
            {lead && (
              <div className={editorial ? 'lg:col-span-2' : ''}>
                <h2 className="text-3xl md:text-[2.75rem] font-bold leading-[1.1] mb-4 [text-wrap:balance]" style={SERIF}>{lead.title}</h2>
                <Body story={lead} className="[&_.prose]:text-lg [&_.prose]:leading-relaxed [&_.prose>*:first-child]:mt-0" />
                {secondary.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    {secondary.map((story) => <StoryCard key={story.key} story={story} />)}
                  </div>
                )}
              </div>
            )}
            {editorial && (
              <aside className={`rounded bg-sky-50 dark:bg-zinc-900 border-t-[3px] border-sky-800 p-5 self-start ${BODY}`}>
                <NodeRenderer node={{ ...editorial.node, id: `${editorial.node.id}::editorial`, info: editorial.body }} />
              </aside>
            )}
          </section>
        )}
        {groups.map((group) => {
          if (group.kind === 'panel') return <Panel key={group.key} node={group.node} />;
          if (group.kind === 'text') {
            return (
              <section key={group.key} className={`mb-10 ${BODY}`}>
                <NodeRenderer node={{ ...group.node, id: group.key, info: group.body }} />
              </section>
            );
          }
          if (group.kind !== 'grid') return null;
          return (
            <section key={group.key} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10 [grid-auto-flow:dense]">
              {group.stories.map((story) => {
                const closing = lastStory?.story.key === story.key;
                const span = closing ? 'md:col-span-2 lg:col-span-3' : isWide(story) ? 'md:col-span-2' : '';
                return <div key={story.key} className={`min-w-0 ${span}`}><StoryCard story={story} large={closing} /></div>;
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ node }: { node: Node }) {
  return (
    <section className="mb-10 border-t-[3px] border-zinc-900 dark:border-zinc-100 pt-2">
      {node.label && <p className={`${KICKER} text-sky-800 dark:text-sky-300 mb-3`}>{node.label}</p>}
      <NodeRenderer node={node} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Layout 2: placed by a plan.
// ---------------------------------------------------------------------------
function PlannedFront({ metadata, nodes, plan }: FrontPageViewProps & { plan: Plan }) {
  const { mastheadImage, editorial, pieces } = readGraph(nodes);
  const stories = pieces.filter((p) => p.kind === 'story').map((p) => (p as Extract<Piece, { kind: 'story' }>).story);
  const used = new Set<string>();
  const take = (start?: string): Story | null => {
    if (!start) return null;
    const story = stories.find((s) => !used.has(s.key) && s.title.startsWith(start));
    if (story) used.add(story.key);
    return story || null;
  };
  const takeAll = (starts?: string[]) => (starts || []).map(take).filter((s): s is Story => !!s);

  const lead = take(plan.lead?.story);
  const follow = takeAll(plan.lead?.follow);
  const cornerStories = takeAll(plan.corner?.stories);
  const beside = takeAll(plan.beside);
  const closing = take(plan.closing);
  const columns = (plan.columns || []).map((column) =>
    (column.groups || []).map((group) => ({ ...group, placed: takeAll(group.stories) })),
  );
  const more = stories.filter((s) => !used.has(s.key));

  // The pull quote is lifted out of its story, so it is not shown twice.
  const bodies = new Map<string, string>();
  let pull: { cited: string; text: string } | null = null;
  if (plan.pullQuote) {
    const source = stories.find((s) => s.title.startsWith(plan.pullQuote as string));
    const match = source?.body.match(QUOTE_BLOCK);
    if (source && match) {
      pull = { cited: match[1].trim(), text: match[2].trim() };
      bodies.set(source.key, source.body.replace(QUOTE_BLOCK, '').trim());
    }
  }
  // The corner shows the first side image of its stories as a portrait.
  let cornerImage: string | null = null;
  for (const story of cornerStories) {
    const body = bodies.get(story.key) ?? story.body;
    const match = body.match(SIDE_IMAGE);
    if (match) {
      cornerImage = match[1];
      bodies.set(story.key, body.replace(SIDE_IMAGE, '').trim());
      break;
    }
  }
  const bodyOf = (story: Story) => bodies.get(story.key);

  const panels = pieces.filter((p) => p.kind === 'panel').map((p) => (p as Extract<Piece, { kind: 'panel' }>).node);
  const bandIds = plan.bands || [];
  const bands = bandIds.map((id) => panels.find((n) => n.id === id)).filter((n): n is Node => !!n);
  const otherPanels = panels.filter((n) => !bandIds.includes(n.id));
  const looseText = pieces.filter((p) => p.kind === 'text') as Array<Extract<Piece, { kind: 'text' }>>;

  // "**Utgave 2 – 2026**" on a line of its own is already in the masthead.
  let editorialBody = editorial?.body || '';
  if (plan.masthead?.right) {
    const first = editorialBody.split('\n')[0].trim();
    if (first.replace(/\*/g, '').trim() === plan.masthead.right.trim()) {
      editorialBody = editorialBody.slice(editorialBody.indexOf('\n') + 1).trim();
    }
  }

  const cornerColor = plan.corner?.color || '#3f8f3a';

  return (
    <div className={PAGE}>
      <div className="max-w-[1180px] mx-auto">
        <Masthead
          title={plan.masthead?.title || metadata?.title || 'Knowledge Graph'}
          left={plan.masthead?.left}
          right={plan.masthead?.right}
          image={mastheadImage}
        />

        {(lead || editorial) && (
          <section className={lead && editorial ? 'grid grid-cols-1 lg:grid-cols-3 gap-7 mb-9' : 'mb-9'}>
            {lead && (
              <article className={editorial ? 'lg:col-span-2 min-w-0' : 'min-w-0'}>
                {plan.lead?.label && <p className={`${KICKER} text-sky-800 dark:text-sky-300 mb-1.5`}>{plan.lead.label}</p>}
                <h2 className="text-[1.9rem] md:text-5xl font-bold leading-[1.06] mb-3 [text-wrap:balance]" style={SERIF}>{lead.title}</h2>
                <Body story={lead} body={bodyOf(lead)} className="[&_.prose]:text-[1.1rem] [&_.prose]:leading-relaxed [&_.prose>*:first-child]:mt-0" />
                {follow.map((story) => (
                  <div key={story.key} className="mt-6"><StoryCard story={story} body={bodyOf(story)} large /></div>
                ))}
              </article>
            )}
            {editorial && editorialBody && (
              <aside className="bg-sky-100/70 dark:bg-zinc-900 border-t-[3px] border-sky-800 px-5 py-4 self-start min-w-0">
                {plan.editorial?.label && <p className={`${KICKER} text-sky-800 dark:text-sky-300 mb-2`}>{plan.editorial.label}</p>}
                <div className={BODY}>
                  <NodeRenderer node={{ ...editorial.node, id: `${editorial.node.id}::editorial`, info: editorialBody }} />
                </div>
              </aside>
            )}
          </section>
        )}

        {bands.map((node) => <Panel key={node.id} node={node} />)}

        {(cornerStories.length > 0 || beside.length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-7 mb-9">
            {cornerStories.length > 0 && (
              <div
                className={`${beside.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} px-5 py-4 min-w-0 border-t-[3px]`}
                style={{ borderColor: cornerColor, backgroundColor: `${cornerColor}1f` }}
              >
                {plan.corner?.label && <p className={`${KICKER} mb-3`} style={{ color: cornerColor }}>{plan.corner.label}</p>}
                <div className={cornerImage ? 'grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5' : ''}>
                  {cornerImage && (
                    <figure className="m-0 justify-self-center">
                      <img src={cornerImage} alt="" className="w-full max-w-[300px] aspect-[4/5] object-cover rounded" />
                      {plan.corner?.caption && (
                        <figcaption className="text-center italic text-zinc-600 dark:text-zinc-400 mt-1.5" style={SERIF}>{plan.corner.caption}</figcaption>
                      )}
                    </figure>
                  )}
                  <div className="flex flex-col gap-5 min-w-0">
                    {cornerStories.map((story) => (
                      <article key={story.key} className="border-t pt-2 min-w-0" style={{ borderColor: cornerColor }}>
                        <h3 className="text-xl font-bold leading-snug mb-2 [text-wrap:balance]" style={SERIF}>{story.title}</h3>
                        <Body story={story} body={bodyOf(story)} />
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {beside.length > 0 && (
              <div className={`flex flex-col gap-6 min-w-0 ${cornerStories.length > 0 ? '' : 'lg:col-span-3'}`}>
                {beside.map((story) => <StoryCard key={story.key} story={story} body={bodyOf(story)} />)}
              </div>
            )}
          </section>
        )}

        {pull && (
          <blockquote className="m-0 mb-9 text-center border-y border-zinc-900 dark:border-zinc-100 py-6 px-2">
            <p className="italic font-semibold text-2xl md:text-4xl leading-tight max-w-[28ch] mx-auto mb-2 [text-wrap:balance]" style={SERIF}>{pull.text}</p>
            <cite className={`not-italic text-zinc-500 dark:text-zinc-400 ${KICKER}`}>{pull.cited}</cite>
          </blockquote>
        )}

        {columns.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-9">
            {columns.map((groups, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-5 min-w-0">
                {groups.map((group, groupIndex) => (
                  <div key={groupIndex} className="flex flex-col gap-5 min-w-0">
                    {group.label && (
                      <p className={`${KICKER} text-sky-800 dark:text-sky-300 border-b border-zinc-900 dark:border-zinc-100 pb-1.5`}>{group.label}</p>
                    )}
                    {group.dates?.items && group.dates.items.length > 0 && (
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 py-3 text-[0.95rem]">
                        {group.dates.title && <p className={`${KICKER} text-zinc-500 dark:text-zinc-400 mb-2`}>{group.dates.title}</p>}
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 m-0">
                          {group.dates.items.map(([when, what], i) => (
                            <div key={i} className="contents">
                              <dt className="font-bold whitespace-nowrap tabular-nums">{when}</dt>
                              <dd className="m-0">{what}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                    {group.placed.map((story) => <StoryCard key={story.key} story={story} body={bodyOf(story)} />)}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {(more.length > 0 || looseText.length > 0) && (
          <section className="mb-9">
            {plan.more?.label && more.length > 0 && (
              <p className={`${KICKER} text-sky-800 dark:text-sky-300 border-b border-zinc-900 dark:border-zinc-100 pb-1.5 mb-5`}>{plan.more.label}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {more.map((story) => <StoryCard key={story.key} story={story} body={bodyOf(story)} />)}
              {looseText.map((piece) => (
                <div key={piece.key} className={`min-w-0 ${BODY}`}>
                  <NodeRenderer node={{ ...piece.node, id: piece.key, info: piece.body }} />
                </div>
              ))}
            </div>
          </section>
        )}

        {otherPanels.map((node) => <Panel key={node.id} node={node} />)}

        {closing && (
          <section className="border-t-4 border-double border-zinc-900 dark:border-zinc-100 pt-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-3 [text-wrap:balance]" style={SERIF}>{closing.title}</h2>
            <Body story={closing} body={bodyOf(closing)} className={`${BODY} [&_.prose]:mx-auto`} />
          </section>
        )}
      </div>
    </div>
  );
}

export default function FrontPageView({ metadata, nodes }: FrontPageViewProps) {
  const plan = findPlan(nodes);
  return plan ? <PlannedFront metadata={metadata} nodes={nodes} plan={plan} /> : <SimpleFront metadata={metadata} nodes={nodes} />;
}
