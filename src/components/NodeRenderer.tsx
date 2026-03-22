
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Node } from '../types';

interface NodeRendererProps {
  node: Node;
}

export default function NodeRenderer({ node }: NodeRendererProps) {
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  if (node.type === 'youtube-video' && node.path) {
    const videoId = getYouTubeId(node.path);
    if (videoId) {
      return (
        <div className="space-y-4">
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={node.label}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {node.info && (
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {node.info}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
  }

  if (!node.info && node.type !== 'youtube-video') return null;

  if (node.type === 'html-node') {
    return (
      <div className="w-full h-[800px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-white">
        <iframe
          srcDoc={node.info}
          title={node.label}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin allow-downloads"
          allow="microphone; display-capture; clipboard-write"
        />
      </div>
    );
  }

  // Simple pre-processor for custom tags
  const processContent = (content: string, commentaries?: any[]) => {
    let processed = content;

    // Handle ![YOUTUBE src=...]title[END YOUTUBE]
    processed = processed.replace(/!\[YOUTUBE src=(.*?)\](.*?)\[END YOUTUBE\]/g, (_, src, title) => {
      const videoId = getYouTubeId(src);
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : src;
      return `<div class="my-6 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-lg bg-black aspect-video">
        <iframe
          src="${embedUrl}"
          title="${title}"
          class="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>`;
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
    processed = processed.replace(/\[QUOTE \| Cited='(.*?)'\]([\s\S]*?)\[END QUOTE\]/g, (_, cited, text) => {
      return `<blockquote class="border-l-4 border-indigo-500 pl-4 my-4 italic text-gray-700 dark:text-gray-300">
        ${text}
        <cite class="block mt-2 text-sm font-semibold text-gray-500">— ${cited}</cite>
      </blockquote>`;
    });

    // Handle [SECTION | background-color:'...'; color:'...']...[END SECTION]
    processed = processed.replace(/\[SECTION \| background-color:'(.*?)'; color:'(.*?)'\]([\s\S]*?)\[END SECTION\]/g, (_, bgColor, color, text) => {
      return `<div class="p-6 my-4 rounded-xl shadow-sm" style="background-color: ${bgColor}; color: ${color};">
        ${text}
      </div>`;
    });

    // Handle [FANCY | font-size:...; color:...; background-image:url('...')]...[END FANCY]
    processed = processed.replace(/\[FANCY \| ([\s\S]*?)\]([\s\S]*?)\[END FANCY\]/g, (_, styles, text) => {
      const styleObj: Record<string, string> = {};
      styles.split(';').forEach((s: string) => {
        const trimmed = s.trim();
        if (!trimmed) return;
        
        const firstColonIndex = trimmed.indexOf(':');
        if (firstColonIndex === -1) return;
        
        const key = trimmed.substring(0, firstColonIndex).trim();
        const value = trimmed.substring(firstColonIndex + 1).trim();
        
        if (key && value) {
          const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          styleObj[camelKey] = value;
        }
      });

      const styleString = Object.entries(styleObj).map(([k, v]) => `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}: ${v}`).join('; ');

      return `<div class="p-8 my-6 rounded-2xl bg-cover bg-center flex flex-col justify-center items-center text-center min-h-[300px]" style="${styleString}">
        <div class="bg-black/30 backdrop-blur-sm p-6 rounded-xl">
          ${text}
        </div>
      </div>`;
    });

    return processed;
  };

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

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
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
              return <img {...props} alt={label} style={styleObj} className="rounded-xl shadow-sm" />;
            }
            
            return <img {...props} className="rounded-xl shadow-sm" />;
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
