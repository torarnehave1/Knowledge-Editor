
import { Plus, FileText, StickyNote, Type, Info, Image as ImageIcon, Youtube, UserPlus, Code, Eye } from 'lucide-react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';

const nodeTypes: { type: NodeType; label: string; icon: any; color: string }[] = [
  { type: 'fulltext', label: 'Full Text', icon: FileText, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { type: 'notes', label: 'Work Note', icon: StickyNote, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { type: 'title', label: 'Title', icon: Type, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { type: 'info', label: 'Info Box', icon: Info, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { type: 'image', label: 'Image', icon: ImageIcon, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { type: 'youtube-video', label: 'YouTube', icon: Youtube, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { type: 'REG', label: 'Registration', icon: UserPlus, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { type: 'html-node', label: 'HTML Section', icon: Code, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
];

export default function Sidebar() {
  const { viewMode, setViewMode, setIsNewGraphModalOpen, addNode } = useStore();

  const isPortfolio = viewMode === 'graphs';

  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-full">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-1">
          <img 
            src="https://favicons.vegvisr.org/favicons/1774176116987-1-1774176120241-512x512.png" 
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
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 px-2">Add Section</h2>
              <div className="grid grid-cols-1 gap-2">
                {nodeTypes.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addNode(item.type)}
                    className="group flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
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
