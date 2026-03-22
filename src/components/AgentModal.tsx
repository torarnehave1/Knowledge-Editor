
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Agent } from '../types';

export const AgentModal: React.FC = () => {
  const { 
    isAgentModalOpen, 
    setIsAgentModalOpen, 
    createAgent, 
    updateAgent, 
    agents, 
    activeAgentId,
    generateAvatar,
    currentGraphId
  } = useStore();

  const editingAgent = agents.find(a => a.id === activeAgentId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  useEffect(() => {
    if (editingAgent && isAgentModalOpen) {
      setName(editingAgent.name);
      setDescription(editingAgent.description);
      setSystemInstruction(editingAgent.systemInstruction);
      setAvatarUrl(editingAgent.avatarUrl || '');
    } else if (isAgentModalOpen) {
      setName('');
      setDescription('');
      setSystemInstruction('You are a helpful AI assistant specialized in analyzing knowledge graphs.');
      setAvatarUrl('');
    }
  }, [editingAgent, isAgentModalOpen]);

  const handleSave = async () => {
    if (!name || !description || !systemInstruction) return;

    if (editingAgent) {
      await updateAgent({
        ...editingAgent,
        name,
        description,
        systemInstruction,
        avatarUrl,
      });
    } else {
      await createAgent({
        name,
        description,
        systemInstruction,
        avatarUrl,
        graphId: currentGraphId || undefined,
      });
    }
    setIsAgentModalOpen(false);
  };

  const handleGenerateAvatar = async () => {
    if (!name || !description) return;
    setIsGeneratingAvatar(true);
    try {
      const url = await generateAvatar(name, description);
      setAvatarUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  if (!isAgentModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
                <p className="text-sm text-gray-500">Define your AI knowledge companion</p>
              </div>
            </div>
            <button
              onClick={() => setIsAgentModalOpen(false)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Graph Explorer"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this agent's specialty?"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="w-32 flex flex-col items-center gap-2">
                <label className="block text-sm font-medium text-gray-700">Avatar</label>
                <div className="w-32 h-32 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="text-gray-400" size={32} />
                  )}
                  {isGeneratingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="text-white animate-spin" size={24} />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerateAvatar}
                  disabled={!name || !description || isGeneratingAvatar}
                  className="w-full py-2 px-3 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles size={14} />
                  AI Generate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Instruction</label>
              <textarea
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                rows={6}
                placeholder="How should the agent behave? What are its rules?"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-400">
                Tip: Be specific about how the agent should interpret the knowledge graph data.
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button
              onClick={() => setIsAgentModalOpen(false)}
              className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name || !description || !systemInstruction}
              className="px-8 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              {editingAgent ? 'Update Agent' : 'Create Agent'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
