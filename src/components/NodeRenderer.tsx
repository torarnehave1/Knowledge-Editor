
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Node } from '../types';

interface NodeRendererProps {
  node: Node;
}

export default function NodeRenderer({ node }: NodeRendererProps) {
  if (!node.info) return null;

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
  const processContent = (content: string) => {
    let processed = content;

    // Handle [QUOTE | Cited='...']...[END QUOTE]
    processed = processed.replace(/\[QUOTE \| Cited='(.*?)'\]([\s\S]*?)\[END QUOTE\]/g, (_, cited, text) => {
      return `<blockquote class="border-l-4 border-indigo-500 pl-4 my-4 italic text-gray-700">
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
        const [key, value] = s.split(':').map(x => x.trim());
        if (key && value) {
          // background-image:url('...') -> backgroundImage: 'url(...)'
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

  const processedInfo = processContent(node.info);

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
    </div>
  );
}
