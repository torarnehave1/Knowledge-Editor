
import { Plus, FileText, StickyNote, Type, Info, Image as ImageIcon, Youtube, UserPlus, Code, Eye, Settings, Sparkles, Bot, MessageSquare, Trash2, Edit3, Globe } from 'lucide-react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';
import { knowledgeService, CONTACT_FORM_TEMPLATE_ID } from '../services/knowledgeService';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// `templateId` entries pull their content from a canonical graphTemplates row
// instead of creating a blank node (single source of truth — see knowledgeService).
const nodeTypes: { type: NodeType; label: string; icon: any; color: string; templateId?: string }[] = [
  { type: 'fulltext', label: 'Full Text', icon: FileText, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { type: 'notes', label: 'Work Note', icon: StickyNote, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { type: 'title', label: 'Title', icon: Type, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { type: 'info', label: 'Info Box', icon: Info, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { type: 'image', label: 'Image', icon: ImageIcon, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { type: 'youtube-video', label: 'YouTube', icon: Youtube, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { type: 'REG', label: 'Registration', icon: UserPlus, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { type: 'html-node', label: 'HTML Section', icon: Code, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { type: 'html-node', label: 'Kontaktskjema', icon: MessageSquare, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', templateId: CONTACT_FORM_TEMPLATE_ID },
];

export default function Sidebar() {
  const { 
    viewMode, 
    setViewMode, 
    setIsNewGraphModalOpen, 
    addNode,
    aiProvider,
    setAiProvider,
    aiModel,
    setAiModel,
    availableModels,
    agents,
    setActiveAgentId,
    setIsAgentModalOpen,
    setIsAgentChatOpen,
    deleteAgent,
    setIsTranslationModalOpen
  } = useStore();

  const [showAiSettings, setShowAiSettings] = useState(false);
  const [insertingTemplate, setInsertingTemplate] = useState<string | null>(null);

  const isPortfolio = viewMode === 'graphs';

  const handleAddSection = async (item: typeof nodeTypes[number]) => {
    if (!item.templateId) {
      addNode(item.type);
      return;
    }
    if (insertingTemplate) return;
    setInsertingTemplate(item.label);
    try {
      const nodes = await knowledgeService.getTemplateNodes(item.templateId);
      const source = nodes.find((n) => n.type === 'html-node') || nodes[0];
      if (!source) throw new Error('Template has no nodes');
      addNode('html-node', { label: source.label, info: source.info, color: source.color });
    } catch (err) {
      console.error(`Failed to insert "${item.label}" template`, err);
      alert(`Kunne ikke hente malen «${item.label}». Prøv igjen.`);
    } finally {
      setInsertingTemplate(null);
    }
  };

  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-full">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-1">
          <img 
            src="https://favicons.vegvisr.org/favicons/1774177136217-1-1774177138248-512x512.png" 
            alt="Logo" 
            className="w-8 h-8 rounded-lg shadow-sm"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Knowledge Editor</h1>
        </div>
        <p className="text-xs text-zinc-500 font-medium mb-4">Build structured documents</p>
        <button
          onClick={() => setIsNewGraphModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus size={16} />
          NEW GRAPH
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!isPortfolio && (
          <>
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">AI Assistant</h2>
                <button 
                  onClick={() => setShowAiSettings(!showAiSettings)}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    showAiSettings ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  )}
                >
                  <Settings size={14} />
                </button>
              </div>

              {showAiSettings && (
                <div className="mx-2 mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl space-y-3 border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Provider</label>
                    <select 
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold py-1.5 px-2 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      {Object.keys(availableModels).length > 0 ? (
                        Object.keys(availableModels).map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))
                      ) : (
                        <option value="gemini">Gemini</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Model</label>
                    <select 
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold py-1.5 px-2 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      {(availableModels[aiProvider] || []).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="px-2 mb-6">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
                  <Sparkles size={14} className="text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase truncate">
                    {(availableModels[aiProvider] || []).find(m => m.id === aiModel)?.name || aiModel || 'Select Model'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">AI Agents</h2>
                <button 
                  onClick={() => setIsAgentModalOpen(true)}
                  className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                  title="Create Agent"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-1 mb-6">
                {agents.length === 0 ? (
                  <div className="px-2 py-3 text-[10px] text-zinc-500 italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
                    No agents defined yet
                  </div>
                ) : (
                  agents.map(agent => (
                    <div key={agent.id} className="group relative">
                      <button
                        onClick={() => {
                          setActiveAgentId(agent.id);
                          setIsAgentChatOpen(true);
                        }}
                        className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {agent.avatarUrl ? (
                            <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Bot size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{agent.name}</p>
                          <p className="text-[9px] text-zinc-500 truncate">{agent.description}</p>
                        </div>
                        <MessageSquare size={12} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                      </button>
                      
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAgentId(agent.id);
                            setIsAgentModalOpen(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAgent(agent.id);
                          }}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 px-2">Add Section</h2>
              <div className="grid grid-cols-1 gap-2">
                {nodeTypes.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleAddSection(item)}
                    disabled={insertingTemplate === item.label}
                    className="group flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm disabled:opacity-50"
                  >
                    <div className={`p-2 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}>
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                    <Plus size={14} className="ml-auto text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 px-2">Operations</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setViewMode('preview')}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
                >
                  <div className="p-2 rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <Eye size={18} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview Mode</span>
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
                >
                  <div className="p-2 rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <Code size={18} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Edit JSON</span>
                </button>
                <button
                  onClick={() => setIsTranslationModalOpen(true)}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Globe size={18} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Translate Graph</span>
                </button>
              </div>
            </div>
          </>
        )}

        {isPortfolio && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 mb-4">
              <Plus size={32} className="opacity-20" />
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Portfolio View</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Select a graph from the list to start editing or adding sections.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Pro Tip</p>
          <p className="text-[11px] leading-relaxed">Use the AI Assistant to generate content for any section.</p>
        </div>
      </div>
    </div>
  );
}
