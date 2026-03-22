import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { X, GripVertical, RotateCcw, Save, FileText, Image as ImageIcon, Video, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStore } from '../store/useStore';
import { Node } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ReorderModal() {
  const { doc, setNodes, isReorderModalOpen, setIsReorderModalOpen } = useStore();
  const [localNodes, setLocalNodes] = useState<Node[]>([]);

  useEffect(() => {
    if (isReorderModalOpen) {
      setLocalNodes([...doc.nodes]);
    }
  }, [isReorderModalOpen, doc.nodes]);

  const handleSave = () => {
    setNodes(localNodes);
    setIsReorderModalOpen(false);
  };

  const handleReset = () => {
    setLocalNodes([...doc.nodes]);
  };

  const handlePositionChange = (index: number, newPos: string) => {
    const pos = parseInt(newPos);
    if (isNaN(pos) || pos < 1 || pos > localNodes.length) return;
    
    const targetIndex = pos - 1;
    const newNodes = [...localNodes];
    const [movedNode] = newNodes.splice(index, 1);
    newNodes.splice(targetIndex, 0, movedNode);
    setLocalNodes(newNodes);
  };

  if (!isReorderModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500">
                <RotateCcw size={20} className="rotate-180" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Reorder Nodes</h2>
            </div>
            <button
              onClick={() => setIsReorderModalOpen(false)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X size={20} className="text-zinc-400" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="px-6 pt-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 flex gap-3 items-start">
              <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                Drag and drop nodes to reorder them, or use the position input fields.
              </p>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <Reorder.Group axis="y" values={localNodes} onReorder={setLocalNodes} className="space-y-3">
              {localNodes.map((node, index) => (
                <ReorderItem 
                  key={node.id} 
                  node={node} 
                  index={index} 
                  total={localNodes.length}
                  onPositionChange={handlePositionChange}
                />
              ))}
            </Reorder.Group>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-3 justify-end bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-3xl">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              onClick={() => setIsReorderModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-widest hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
            >
              <Save size={14} />
              Save Order
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ReorderItem({ 
  node, 
  index, 
  total,
  onPositionChange
}: { 
  node: Node; 
  index: number; 
  total: number;
  onPositionChange: (index: number, pos: string) => void;
}) {
  const dragControls = useDragControls();

  const getIcon = () => {
    switch (node.type) {
      case 'image': return <ImageIcon size={16} />;
      case 'youtube-video': return <Video size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <Reorder.Item
      value={node}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "flex items-center gap-4 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-zinc-400">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 truncate">{node.label}</h4>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">({node.type})</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Position:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={index + 1}
              onChange={(e) => onPositionChange(index, e.target.value)}
              className="w-12 h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs font-bold text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <span className="text-[10px] font-bold text-zinc-400">/ {total}</span>
          </div>
        </div>

        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <GripVertical size={18} />
        </div>
      </div>
    </Reorder.Item>
  );
}
