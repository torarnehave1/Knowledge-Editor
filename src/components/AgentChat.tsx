
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, Trash2, Maximize2, Minimize2, Loader2, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AgentChat: React.FC = () => {
  const { 
    isAgentChatOpen, 
    setIsAgentChatOpen, 
    activeAgentId, 
    agents, 
    agentMessages, 
    sendAgentMessage, 
    clearAgentChat,
    isLoading 
  } = useStore();

  const [input, setInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const messages = agentMessages.filter(m => m.agentId === activeAgentId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    await sendAgentMessage(message);
  };

  if (!isAgentChatOpen || !activeAgent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 100, x: 100 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0, 
          x: 0,
          width: isMaximized ? 'calc(100% - 2rem)' : '400px',
          height: isMaximized ? 'calc(100% - 2rem)' : '600px',
          bottom: '1rem',
          right: '1rem'
        }}
        exit={{ opacity: 0, scale: 0.9, y: 100, x: 100 }}
        className="fixed z-[90] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
              {activeAgent.avatarUrl ? (
                <img src={activeAgent.avatarUrl} alt={activeAgent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Bot size={20} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{activeAgent.name}</h3>
              <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold">AI Agent Active</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              onClick={() => setIsAgentChatOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Bot size={32} />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Start a conversation</h4>
                <p className="text-sm text-gray-500">Ask {activeAgent.name} anything about your knowledge graph.</p>
              </div>
            </div>
          )}
          
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden ${
                  m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {m.role === 'user' ? (
                    <User size={16} />
                  ) : activeAgent.avatarUrl ? (
                    <img src={activeAgent.avatarUrl} alt={activeAgent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                <div className={`p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'
                }`}>
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-[10px] mt-1 opacity-50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin" />
                </div>
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <form onSubmit={handleSend} className="flex gap-2">
            <button
              type="button"
              onClick={clearAgentChat}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear Chat"
            >
              <Trash2 size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${activeAgent.name}...`}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
