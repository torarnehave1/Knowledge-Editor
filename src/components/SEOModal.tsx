import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, X, Sparkles, Image as ImageIcon, Check, Copy, ExternalLink, Facebook, Twitter, Loader2, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SEOModal() {
  const { 
    doc, 
    isSEOModalOpen, 
    setIsSEOModalOpen, 
    seoStatus, 
    seoUrl, 
    publishSEOPage,
    generateSEODescription,
    generateSEOKeywords,
    currentGraphId
  } = useStore();

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isSEOModalOpen && doc.metadata) {
      setSlug(doc.metadata.seoSlug || doc.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
      setTitle(doc.metadata.title || '');
      setDescription(doc.metadata.seoDescription || '');
      setKeywords(doc.metadata.seoKeywords || '');
      
      // If no OG image is set, try to find the first one in the graph
      if (!doc.metadata.seoOgImage) {
        const imageNode = doc.nodes.find(n => n.type === 'image' && n.path);
        if (imageNode && imageNode.path) {
          setOgImage(imageNode.path);
        } else {
          // Look for markdown images in info
          const imgMatch = doc.nodes.find(n => n.info?.match(/!\[.*?\]\((.*?)\)/))?.info?.match(/!\[.*?\]\((.*?)\)/);
          if (imgMatch && imgMatch[1]) {
            setOgImage(imgMatch[1]);
          } else {
            setOgImage('');
          }
        }
      } else {
        setOgImage(doc.metadata.seoOgImage);
      }
    }
  }, [isSEOModalOpen, doc.metadata, doc.nodes]);

  const handleAutoSlug = () => {
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setSlug(newSlug);
  };

  const handleGenerateDescription = async () => {
    try {
      setIsGeneratingDesc(true);
      const desc = await generateSEODescription(title);
      if (desc) {
        setDescription(desc);
      }
    } catch (e) {
      console.error('Failed to generate description:', e);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGenerateKeywords = async () => {
    try {
      setIsGeneratingKeywords(true);
      const kw = await generateSEOKeywords(title);
      if (kw) {
        setKeywords(kw);
      }
    } catch (e) {
      console.error('Failed to generate keywords:', e);
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  const handleSelectImageFromGraph = () => {
    // 1. Check for image nodes
    const imageNode = doc.nodes.find(n => n.type === 'image' && n.path);
    if (imageNode && imageNode.path) {
      setOgImage(imageNode.path);
      return;
    }

    // 2. Check for markdown images in info fields
    for (const node of doc.nodes) {
      if (node.info) {
        const imgMatch = node.info.match(/!\[.*?\]\((.*?)\)/);
        if (imgMatch && imgMatch[1]) {
          setOgImage(imgMatch[1]);
          return;
        }
      }
    }

    // 3. Check for any path that looks like an image
    const anyImageNode = doc.nodes.find(n => n.path && (n.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$|picsum\.photos/i)));
    if (anyImageNode && anyImageNode.path) {
      setOgImage(anyImageNode.path);
    }
  };

  const handlePublish = () => {
    publishSEOPage({
      slug,
      title,
      description,
      ogImage,
      keywords
    });
  };

  const copyToClipboard = () => {
    if (seoUrl) {
      navigator.clipboard.writeText(seoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isValidSlug = /^[a-z0-9-]+$/.test(slug);

  if (!isSEOModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">SEO & Social Optimization</h2>
              <p className="text-xs text-zinc-500 font-medium">Generate a high-performance static page for search engines</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSEOModalOpen(false)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {seoStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <Check size={40} />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Successfully Published!</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md">Your knowledge graph is now live as a static SEO-friendly page. It will be indexed by Google and look great on social media.</p>
              
              <div className="w-full max-w-lg bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 mb-8">
                <div className="flex-1 truncate font-mono text-sm text-indigo-600 dark:text-indigo-400">
                  {seoUrl}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Copy URL"
                  >
                    {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-zinc-500" />}
                  </button>
                  <a 
                    href={seoUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
                    title="Open Page"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsSEOModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Done
                </button>
                <button 
                  onClick={() => setIsSEOModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Update SEO Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Form Side */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">URL Slug</label>
                    <button 
                      onClick={handleAutoSlug}
                      className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      Auto-generate
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">/graph/</span>
                    <input 
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className={cn(
                        "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl pl-16 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
                        isValidSlug ? "border-zinc-200 dark:border-zinc-800" : "border-red-500 ring-1 ring-red-500/20"
                      )}
                      placeholder="norse-mythology-guide"
                    />
                  </div>
                  {!isValidSlug && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-widest">Lowercase, numbers, and hyphens only</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Page Title</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Enter page title..."
                    />
                    <span className={cn(
                      "absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest",
                      title.length > 60 ? "text-amber-500" : "text-zinc-400"
                    )}>
                      {title.length}/60
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Meta Description</label>
                    <button 
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDesc || !title}
                      className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Generate
                    </button>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                      placeholder="Enter meta description for search results..."
                    />
                    <span className={cn(
                      "absolute right-4 bottom-4 text-[10px] font-bold uppercase tracking-widest",
                      description.length > 160 ? "text-amber-500" : "text-zinc-400"
                    )}>
                      {description.length}/160
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Social Media Image (OG Image)</label>
                    <button 
                      onClick={handleSelectImageFromGraph}
                      className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1"
                    >
                      <ImageIcon size={12} />
                      Suggest from Graph
                    </button>
                  </div>
                  <input 
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Keywords (Comma separated)</label>
                    <button 
                      onClick={handleGenerateKeywords}
                      disabled={isGeneratingKeywords || !title}
                      className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingKeywords ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Generate
                    </button>
                  </div>
                  <input 
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="history, mythology, guide"
                  />
                </div>
              </div>

              {/* Preview Side */}
              <div className="space-y-8">
                <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Facebook size={14} />
                    Facebook Preview
                  </h3>
                  <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="aspect-[1200/630] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {ogImage ? (
                        <img src={ogImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={48} className="text-zinc-300" />
                      )}
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">VEGVISR.ORG</p>
                      <h4 className="font-bold text-zinc-900 dark:text-white truncate mb-1">{title || 'Page Title'}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2">{description || 'Page description will appear here...'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Twitter size={14} />
                    Twitter Preview
                  </h3>
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex">
                    <div className="w-32 h-32 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      {ogImage ? (
                        <img src={ogImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={24} className="text-zinc-300" />
                      )}
                    </div>
                    <div className="p-4 flex flex-col justify-center">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate mb-1">{title || 'Page Title'}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-1">{description || 'Page description will appear here...'}</p>
                      <p className="text-[10px] text-zinc-400">vegvisr.org</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handlePublish}
                    disabled={seoStatus === 'generating' || !slug || !title || !isValidSlug}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-sm font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {seoStatus === 'generating' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        PUBLISHING...
                      </>
                    ) : (
                      <>
                        <Globe size={18} />
                        PUBLISH SEO PAGE
                      </>
                    )}
                  </button>
                  {seoStatus === 'error' && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                      <AlertCircle size={14} />
                      Failed to publish. Please try again.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
