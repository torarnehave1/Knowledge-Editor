
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Sparkles, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
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
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [maxTurns, setMaxTurns] = useState(20);
  const [temperature, setTemperature] = useState(0.7);
  const [modalities, setModalities] = useState<string[]>(['text']);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAgent && isAgentModalOpen) {
      setName(editingAgent.name);
      setDescription(editingAgent.description);
      setSystemInstruction(editingAgent.systemInstruction);
      setAvatarUrl(editingAgent.avatarUrl || '');
      setModel(editingAgent.model || 'gemini-3-flash-preview');
      setMaxTurns(editingAgent.maxTurns || 20);
      setTemperature(editingAgent.temperature || 0.7);
      setModalities(editingAgent.modalities || ['text']);
    } else if (isAgentModalOpen) {
      setName('');
      setDescription('');
      setSystemInstruction('You are a helpful AI assistant specialized in analyzing knowledge graphs.');
      setAvatarUrl('');
      setModel('gemini-3-flash-preview');
      setMaxTurns(20);
      setTemperature(0.7);
      setModalities(['text']);
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
        model,
        maxTurns,
        temperature,
        modalities,
      });
    } else {
      await createAgent({
        name,
        description,
        systemInstruction,
        avatarUrl,
        graphId: currentGraphId || undefined,
        model,
        maxTurns,
        temperature,
        modalities,
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Handle files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      return;
    }

    // Handle URLs (e.g. from Photos app or web)
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
      setAvatarUrl(url);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
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
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-32 h-32 rounded-2xl bg-gray-100 border-2 border-dashed flex items-center justify-center overflow-hidden relative group cursor-pointer transition-all ${
                    isDragging ? 'border-indigo-500 bg-indigo-50 scale-105' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                  }`}
                >
                  {avatarUrl ? (
                    <>
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="text-white" size={24} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-medium">Drop or Click</span>
                    </div>
                  )}
                  {isGeneratingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="text-white animate-spin" size={24} />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateAvatar();
                  }}
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

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced)</option>
                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Efficient)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Conversation Turns: {maxTurns}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={maxTurns}
                    onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Short Context</span>
                    <span>Long Context</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creativity (Temperature): {temperature}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modalities</label>
                  <div className="flex flex-wrap gap-2">
                    {['text', 'image', 'video', 'audio'].map((mod) => (
                      <button
                        key={mod}
                        onClick={() => {
                          if (modalities.includes(mod)) {
                            setModalities(modalities.filter(m => m !== mod));
                          } else {
                            setModalities([...modalities, mod]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          modalities.includes(mod)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {mod.charAt(0).toUpperCase() + mod.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
