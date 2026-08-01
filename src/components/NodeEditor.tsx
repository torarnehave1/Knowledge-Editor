
import { Node, NodeType, Commentary } from '../types';
import { X, Save, Trash2, Wand2, Globe, ShieldAlert, Eye, MessageSquare, Youtube, Quote, Layout, Sparkles, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStore } from '../store/useStore';
import ContactRoutingSection from './ContactRoutingSection';
import getCaretCoordinates from 'textarea-caret';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TagSuggestion {
  id: string;
  label: string;
  icon: any;
  template: string;
  cursorOffset: number; // Where to place the cursor after insertion
  description: string;
}

const SUGGESTIONS: TagSuggestion[] = [
  { 
    id: 'youtube', 
    label: 'YOUTUBE', 
    icon: Youtube, 
    template: '![YOUTUBE src=]title[END YOUTUBE]', 
    cursorOffset: 14,
    description: 'Embed a YouTube video'
  },
  { 
    id: 'commentary', 
    label: 'COMMENTARY', 
    icon: MessageCircle, 
    template: "[COMMENTARY | id='']text[END COMMENTARY]", 
    cursorOffset: 17,
    description: 'Add a scholarly footnote'
  },
  { 
    id: 'quote', 
    label: 'QUOTE', 
    icon: Quote, 
    template: "[QUOTE | Cited='']text[END QUOTE]", 
    cursorOffset: 16,
    description: 'Styled blockquote with citation'
  },
  { 
    id: 'section', 
    label: 'SECTION', 
    icon: Layout, 
    template: "[SECTION | background-color:''; color:'']text[END SECTION]", 
    cursorOffset: 27,
    description: 'Colored background container'
  },
  { 
    id: 'fancy', 
    label: 'FANCY', 
    icon: Sparkles, 
    template: "[FANCY | font-size:; color:; background-image:url('')]text[END FANCY]", 
    cursorOffset: 47,
    description: 'Hero section with background image'
  },
];

export default function NodeEditor() {
  const { 
    editingNodeId, 
    doc, 
    setEditingNodeId, 
    saveNode, 
    deleteNode, 
    askAI, 
    setViewMode, 
    saveGraph,
    isGenerating,
    error: storeError,
    setError: setStoreError
  } = useStore();

  const node = doc.nodes.find(n => n.id === editingNodeId);
  
  const [editedNode, setEditedNode] = useState<Node | null>(node ? { ...node } : null);
  const [aiPrompt, setAiPrompt] = useState('');

  // Sync with store when AI finishes generating
  useEffect(() => {
    if (node && !isGenerating) {
      setEditedNode(prev => {
        if (!prev) return { ...node };
        // Only update if the store has a different info (meaning AI updated it)
        if (prev.info !== node.info) {
          setAiPrompt(''); // Clear prompt after success
          return { ...prev, info: node.info, commentaries: node.commentaries };
        }
        return prev;
      });
    }
  }, [node, isGenerating]);
  const [commentaryPromptOpen, setCommentaryPromptOpen] = useState(false);
  const [commentaryText, setCommentaryText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggestion Menu State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSuggestions) {
        setShowSuggestions(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showSuggestions]);

  if (!node || !editedNode) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedNode(prev => prev ? ({ ...prev, [name]: value }) : null);

    // Handle Suggestions Trigger
    if (name === 'info' && textareaRef.current) {
      const cursor = textareaRef.current.selectionStart;
      const textBefore = value.substring(0, cursor);
      
      // Look for the last '[' or '!['
      const lastBracket = textBefore.lastIndexOf('[');
      if (lastBracket !== -1) {
        const triggerText = textBefore.substring(lastBracket);
        // Trigger if it starts with '[' or '![' and doesn't have a space
        if ((triggerText === '[' || triggerText === '![') || (triggerText.startsWith('[') && !triggerText.includes(' '))) {
          const coords = getCaretCoordinates(textareaRef.current, cursor);
          setSuggestionPos({ 
            top: coords.top + 24, // Offset below the line
            left: coords.left 
          });
          setFilterText(triggerText.replace(/^!\[|^\[/, '').toUpperCase());
          setShowSuggestions(true);
          setSelectedIndex(0);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const filteredSuggestions = SUGGESTIONS.filter(s => s.label.includes(filterText));

  const insertSuggestion = (suggestion: TagSuggestion) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = editedNode.info?.substring(0, cursor) || '';
    const textAfter = editedNode.info?.substring(cursor) || '';
    
    // Find where the trigger started (could be '[' or '![')
    const lastBracket = textBefore.lastIndexOf('[');
    let triggerStart = lastBracket;
    if (lastBracket > 0 && textBefore[lastBracket - 1] === '!') {
      triggerStart = lastBracket - 1;
    }
    
    const prefix = textBefore.substring(0, triggerStart);
    const newInfo = prefix + suggestion.template + textAfter;
    
    setEditedNode(prev => prev ? ({ ...prev, info: newInfo }) : null);
    setShowSuggestions(false);

    // Focus and place cursor inside the template
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = triggerStart + suggestion.cursorOffset;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          insertSuggestion(filteredSuggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const handleFixErrors = () => {
    askAI(editedNode.id, "Analyze this HTML code, fix any syntax errors, ensure it is responsive, and follow best practices. Return only the corrected code.");
  };

  const handleAddCommentary = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = editedNode.info?.substring(start, end);

    if (!selectedText) {
      setLocalError("Please select some text to add a commentary.");
      setTimeout(() => setLocalError(null), 3000);
      return;
    }

    setSelectionRange({ start, end });
    setCommentaryPromptOpen(true);
  };

  const confirmAddCommentary = () => {
    if (!selectionRange || !commentaryText.trim()) return;
    
    const { start, end } = selectionRange;
    const selectedText = editedNode.info?.substring(start, end);
    const commentaryId = uuidv4();
    const newCommentary: Commentary = {
      id: commentaryId,
      text: commentaryText,
      author: "Tor Arne Håve",
      initials: "TAH",
      createdAt: new Date().toISOString()
    };

    const newInfo = 
      (editedNode.info?.substring(0, start) || '') + 
      `[COMMENTARY | id='${commentaryId}']${selectedText}[END COMMENTARY]` + 
      (editedNode.info?.substring(end) || '');

    setEditedNode(prev => prev ? ({
      ...prev,
      info: newInfo,
      commentaries: [...(prev.commentaries || []), newCommentary]
    }) : null);

    setCommentaryPromptOpen(false);
    setCommentaryText('');
    setSelectionRange(null);
  };

  const isHtmlNode = editedNode.type === 'html-node';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Edit Section</h3>
          {isHtmlNode && (
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-200 dark:border-indigo-800">
              Advanced HTML
            </span>
          )}
          {(localError || storeError) && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-red-200 dark:border-red-800 animate-pulse">
              {localError || storeError}
            </span>
          )}
        </div>
        <button onClick={() => setEditingNodeId(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Label</label>
            <input
              type="text"
              name="label"
              value={editedNode.label}
              onChange={handleChange}
              className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Type</label>
            <select
              name="type"
              value={editedNode.type}
              onChange={handleChange}
              className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="fulltext">Full Text</option>
              <option value="notes">Notes</option>
              <option value="title">Title</option>
              <option value="info">Info</option>
              <option value="image">Image</option>
              <option value="youtube-video">YouTube Video</option>
              <option value="audio">Audio</option>
              <option value="audio-visualizer">Audio Visualizer</option>
              <option value="REG">Registration</option>
              <option value="html-node">HTML Section</option>
            </select>
          </div>
        </div>

        {editedNode.type === 'youtube-video' && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">YouTube URL</label>
            <input
              type="text"
              name="path"
              value={editedNode.path || ''}
              onChange={(e) => {
                const val = e.target.value;
                setEditedNode(prev => prev ? ({ 
                  ...prev, 
                  path: val,
                  bibl: [val] // Sync bibl with path as per guide
                }) : null);
              }}
              placeholder="https://youtu.be/..."
              className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[10px] text-zinc-500">Paste the full YouTube URL here (e.g., https://youtu.be/dQw4w9WgXcQ)</p>
          </div>
        )}

        {editedNode.type === 'audio' && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Audio URL</label>
            <input
              type="text"
              name="path"
              value={editedNode.path || ''}
              onChange={(e) => {
                const val = e.target.value;
                setEditedNode(prev => prev ? ({ 
                  ...prev, 
                  path: val
                }) : null);
              }}
              placeholder="https://audio.vegvisr.org/..."
              className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[10px] text-zinc-500">Paste the full audio file URL here (mp3, wav, etc.)</p>
          </div>
        )}

        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <input
            type="checkbox"
            id="visible"
            checked={editedNode.visible}
            onChange={(e) => setEditedNode(prev => prev ? ({ ...prev, visible: e.target.checked }) : null)}
            className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="visible" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Visible in document
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              name="color"
              value={editedNode.color}
              onChange={handleChange}
              className="h-10 w-20 rounded border border-zinc-200 dark:border-zinc-800 cursor-pointer"
            />
            <input
              type="text"
              name="color"
              value={editedNode.color}
              onChange={handleChange}
              className="flex-1 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm outline-none"
            />
          </div>
        </div>

        {(editedNode.info || '').includes('vgcontact') && (
          <ContactRoutingSection nodeId={editedNode.id} />
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {isHtmlNode ? 'HTML Source Code' : 'Content (Markdown/HTML)'}
            </label>
            <div className="flex gap-2">
              {!isHtmlNode && (
                <button
                  onClick={handleAddCommentary}
                  className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  <MessageSquare size={12} />
                  Add Commentary
                </button>
              )}
              {isHtmlNode && (
                <button
                  onClick={handleFixErrors}
                  className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <ShieldAlert size={12} />
                  AI Fix Errors
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              name="info"
              value={editedNode.info || ''}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={isHtmlNode ? 20 : 12}
              disabled={isGenerating}
              className={cn(
                "w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-opacity",
                isGenerating && "opacity-50"
              )}
              placeholder={isHtmlNode ? "<!DOCTYPE html>..." : "Enter content here... (Type '[' for suggestions)"}
            />
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[1px] rounded-lg">
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">AI is generating...</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Suggestions Menu */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div 
              className="fixed z-[100] w-64 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
              style={{ 
                top: textareaRef.current ? textareaRef.current.getBoundingClientRect().top + suggestionPos.top : 0,
                left: textareaRef.current ? textareaRef.current.getBoundingClientRect().left + suggestionPos.left : 0
              }}
            >
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Insert Tag</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => insertSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors",
                      index === selectedIndex ? "bg-indigo-50 dark:bg-indigo-900/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-950"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      index === selectedIndex ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}>
                      <suggestion.icon size={16} />
                    </div>
                    <div>
                      <p className={cn("text-xs font-bold", index === selectedIndex ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300")}>
                        {suggestion.label}
                      </p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{suggestion.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
            <Wand2 size={16} />
            AI Assistant
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={isHtmlNode ? "Ask AI to build a component..." : "Ask AI to write or edit..."}
              className="flex-1 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => askAI(editedNode.id, aiPrompt)}
              disabled={isGenerating || !aiPrompt.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                'Ask'
              )}
            </button>
          </div>
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 leading-relaxed">
            {isHtmlNode 
              ? "Example: 'Create a 3D canvas with Three.js' or 'Build a responsive dashboard with Bootstrap'"
              : "Example: 'Write an intro about Hermeticism' or 'Make this text more professional'"}
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between bg-zinc-50 dark:bg-zinc-950">
        <button
          onClick={() => deleteNode(editedNode.id)}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-sm font-medium transition-colors"
        >
          <Trash2 size={18} />
          Delete
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              saveNode(editedNode);
              setViewMode('preview');
            }}
            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye size={18} />
            Preview
          </button>
          {isHtmlNode && (
            <button
              onClick={() => console.log(`Publishing node ${editedNode.id} to domain...`)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Globe size={18} />
              Publish
            </button>
          )}
          <button
            onClick={() => setEditingNodeId(null)}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveNode(editedNode)}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Commentary Prompt Modal */}
      {commentaryPromptOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Add Commentary</h4>
            <textarea
              autoFocus
              value={commentaryText}
              onChange={(e) => setCommentaryText(e.target.value)}
              placeholder="Enter your scholarly notes..."
              rows={4}
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setCommentaryPromptOpen(false);
                  setCommentaryText('');
                  setSelectionRange(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAddCommentary}
                disabled={!commentaryText.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
