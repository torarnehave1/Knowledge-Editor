
import { Plus, FileText, StickyNote, Type, Info, Image as ImageIcon, Youtube, UserPlus, Code } from 'lucide-react';
import { NodeType } from '../types';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onShowJson: () => void;
}

const nodeTypes: { type: NodeType; label: string; icon: any; color: string }[] = [
  { type: 'fulltext', label: 'Full Text', icon: FileText, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { type: 'notes', label: 'Work Note', icon: StickyNote, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { type: 'title', label: 'Title', icon: Type, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { type: 'info', label: 'Info Box', icon: Info, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { type: 'image', label: 'Image', icon: ImageIcon, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { type: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { type: 'REG', label: 'Registration', icon: UserPlus, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { type: 'html-node', label: 'HTML Section', icon: Code, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
];

export default function Sidebar({ onAddNode, onShowJson }: SidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-full">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Knowledge Editor</h1>
        <p className="text-xs text-zinc-500 mt-1 font-medium">Build structured documents</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 px-2">Add Section</h2>
          <div className="grid grid-cols-1 gap-2">
            {nodeTypes.map((item) => (
              <button
                key={item.type}
                onClick={() => onAddNode(item.type)}
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
          <button
            onClick={onShowJson}
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
          >
            <div className="p-2 rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Code size={18} />
            </div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">View JSON</span>
          </button>
        </div>
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
