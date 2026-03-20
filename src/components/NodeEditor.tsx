
import { Node, NodeType } from '../types';
import { X, Save, Trash2, Wand2, Globe, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

interface NodeEditorProps {
  node: Node;
  onSave: (updatedNode: Node) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAskAI: (id: string, prompt: string) => void;
  onPublish?: (node: Node) => void;
}

export default function NodeEditor({ node, onSave, onDelete, onClose, onAskAI, onPublish }: NodeEditorProps) {
  const [editedNode, setEditedNode] = useState<Node>({ ...node });
  const [aiPrompt, setAiPrompt] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedNode(prev => ({ ...prev, [name]: value }));
  };

  const handleFixErrors = () => {
    onAskAI(editedNode.id, "Analyze this HTML code, fix any syntax errors, ensure it is responsive, and follow best practices. Return only the corrected code.");
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
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
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
              <option value="youtube">YouTube</option>
              <option value="REG">Registration</option>
              <option value="html-node">HTML Section</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <input
            type="checkbox"
            id="visible"
            checked={editedNode.visible}
            onChange={(e) => setEditedNode(prev => ({ ...prev, visible: e.target.checked }))}
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

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {isHtmlNode ? 'HTML Source Code' : 'Content (Markdown/HTML)'}
            </label>
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
          <textarea
            name="info"
            value={editedNode.info || ''}
            onChange={handleChange}
            rows={isHtmlNode ? 20 : 12}
            className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder={isHtmlNode ? "<!DOCTYPE html>..." : "Enter content here..."}
          />
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
              onClick={() => onAskAI(editedNode.id, aiPrompt)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ask
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
          onClick={() => onDelete(editedNode.id)}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-sm font-medium transition-colors"
        >
          <Trash2 size={18} />
          Delete
        </button>
        <div className="flex gap-2">
          {isHtmlNode && onPublish && (
            <button
              onClick={() => onPublish(editedNode)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Globe size={18} />
              Publish
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedNode)}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
