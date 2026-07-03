import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Node } from '../types';
import { Music, Play, Pause, Volume2, SkipBack, SkipForward, Activity } from 'lucide-react';

interface NodeRendererProps {
  node: Node;
}

export default function NodeRenderer({ node }: NodeRendererProps) {
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
                {node.info}
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

  if (node.type === 'youtube-video' && node.path) {
    const videoId = getYouTubeId(node.path);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : (node.path.includes('embed') ? node.path : null);
    
    if (embedUrl) {
      return (
        <div className="space-y-4">
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-black">
            <iframe
              src={embedUrl}
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

    // Handle [SECTION | background-color:'...'; color:'...']...[END SECTION]
    processed = processed.replace(/\[SECTION\s*\|\s*background-color\s*:\s*['"]?(.*?)['"]?\s*;\s*color\s*:\s*['"]?(.*?)['"]?\s*\]([\s\S]*?)\[END SECTION\]/gi, (_, bgColor, color, text) => {
      return `\n\n<div class="p-10 my-8 rounded-3xl shadow-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50" style="background-color: ${bgColor.trim()}; color: ${color.trim()};"><div class="break-words">\n\n${text}\n\n</div></div>\n\n`;
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
