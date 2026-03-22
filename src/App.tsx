import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, ChevronUp, ChevronDown, Eye, Code, Plus, Save, Loader2, Database, List, Check, AlertCircle, X, Search, Activity, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Node, NodeType, User } from './types';
import { VALID_NODE_TYPES } from './constants';
import { EcosystemNav } from 'vegvisr-ui-kit';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import NodeRenderer from './components/NodeRenderer';
import ReorderModal from './components/ReorderModal';
import { Login } from './components/Login';
import { useStore } from './store/useStore';
import { LogOut } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const {
    doc,
    setDoc,
    viewMode,
    setViewMode,
    jsonValue,
    setJsonValue,
    isGenerating,
    isLoading,
    graphList,
    trashList,
    metaAreas,
    selectedMetaArea,
    setSelectedMetaArea,
    selectedNodeType,
    setSelectedNodeType,
    searchQuery,
    setSearchQuery,
    isNewGraphModalOpen,
    setIsNewGraphModalOpen,
    isReorderModalOpen,
    setIsReorderModalOpen,
    newGraphTitle,
    setNewGraphTitle,
    newGraphMetaArea,
    setNewGraphMetaArea,
    deleteConfirmationId,
    setDeleteConfirmationId,
    editingNodeId,
    setEditingNodeId,
    isTrashView,
    setIsTrashView,
    error,
    setError,
    currentGraphId,
    saveStatus,
    fetchGraphs,
    fetchTrash,
    loadGraph,
    saveGraph,
    createNewGraph,
    deleteGraph,
    restoreGraph,
    moveNode,
    setNodes,
    saveNode,
    deleteNode,
    user,
    logout,
    checkAuth
  } = useStore();

  const getMetaArea = (graph: any): string => {
    const area = graph.metaArea || graph.metadata?.metaArea || '';
    if (typeof area === 'string') return area;
    if (area && typeof area === 'object') {
      return (area as any).name || (area as any).label || (area as any).title || String(area);
    }
    return String(area || '');
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (viewMode === 'json') {
      setJsonValue(JSON.stringify(doc, null, 2));
    }
    if (viewMode === 'graphs') {
      if (isTrashView) {
        fetchTrash();
      } else {
        fetchGraphs();
      }
    }
  }, [viewMode, doc, selectedMetaArea, selectedNodeType, searchQuery, isTrashView, fetchGraphs, fetchTrash, setJsonValue]);

  const handleApplyJson = () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonValue);
      setDoc(parsed);
      setViewMode('preview');
    } catch (e) {
      setError('Invalid JSON format. Please check your syntax.');
    }
  };

  const formatJson = () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonValue);
      setJsonValue(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setError('Cannot format invalid JSON');
    }
  };

  const editingNode = doc.nodes.find(n => n.id === editingNodeId);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <EcosystemNav className="flex-shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-2 text-slate-100 z-50" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-8 bg-white dark:bg-zinc-950 z-10">
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setViewMode('edit')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'edit' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Code size={16} />
                Editor
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all group",
                  viewMode === 'preview' 
                    ? "bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400 ring-1 ring-zinc-200 dark:ring-zinc-700" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Eye size={18} className={cn(viewMode === 'preview' ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-600")} />
                Preview
              </button>
            </div>

            {currentGraphId && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Activity size={14} className="text-indigo-500" />
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
                  {doc.metadata?.title || 'Untitled Graph'}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/50 animate-in fade-in slide-in-from-left-2">
                <AlertCircle size={14} />
                {error}
                <button onClick={() => setError(null)} className="ml-2 hover:text-red-800 dark:hover:text-red-200">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-3 mr-2 pr-4 border-r border-zinc-200 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
            {viewMode === 'graphs' && currentGraphId && (
              <button 
                onClick={() => setViewMode('edit')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-indigo-100 dark:border-indigo-800/50"
              >
                <Activity size={18} />
                ACTIVE GRAPH
              </button>
            )}
            {viewMode === 'edit' && (
              <button 
                onClick={() => setIsReorderModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  isReorderModalOpen 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                )}
              >
                <RotateCcw size={18} className="rotate-180" />
                Reorder Nodes
              </button>
            )}
            <button 
              onClick={() => setViewMode('graphs')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                viewMode === 'graphs' 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              <Database size={18} />
              My Graphs
            </button>
            <button 
              onClick={() => saveGraph()}
              disabled={saveStatus === 'saving'}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95",
                saveStatus === 'success' ? "bg-emerald-500 text-white" : 
                saveStatus === 'error' ? "bg-red-500 text-white" :
                "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              )}
            >
              {saveStatus === 'saving' ? <Loader2 size={18} className="animate-spin" /> : 
               saveStatus === 'success' ? <Check size={18} /> : 
               saveStatus === 'error' ? <AlertCircle size={18} /> : 
               <Save size={18} />}
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'success' ? 'Saved' : 
               saveStatus === 'error' ? 'Error' : 
               'Save Document'}
            </button>
          </div>
        </header>

        <div className={cn(
          "flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 p-8",
          viewMode === 'edit' && "pl-16 md:pl-20" // Add padding to make room for side buttons
        )}>
          <div className="max-w-6xl mx-auto space-y-8">
            {viewMode === 'graphs' ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <List size={24} />
                      </div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Knowledge Graphs</h2>
                    </div>
                    
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <button
                        onClick={() => setIsTrashView(false)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                          !isTrashView ? "bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setIsTrashView(true)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                          isTrashView ? "bg-white dark:bg-zinc-700 shadow-sm text-red-600 dark:text-red-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        Trash
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {!isTrashView && (
                      <>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input 
                            type="text"
                            placeholder="Search graphs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-1.5 pl-9 pr-3 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none w-32 sm:w-48"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Filter:</span>
                          <select 
                            value={selectedMetaArea}
                            onChange={(e) => setSelectedMetaArea(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-1.5 px-3 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer max-w-[180px] truncate"
                          >
                            <option value="All">All Areas</option>
                            {(() => {
                              const combined = new Map<string, number>();
                              
                              // Add from API
                              if (Array.isArray(metaAreas)) {
                                metaAreas.forEach(item => {
                                  combined.set(item.name, (combined.get(item.name) || 0) + item.count);
                                });
                              }
                              
                              // Add from graph list (ensure we don't miss any)
                              graphList.forEach(graph => {
                                const area = getMetaArea(graph);
                                if (area) {
                                  // If it wasn't in the API list, it has at least 1 count from this list
                                  if (!combined.has(area)) {
                                    combined.set(area, 1);
                                  }
                                }
                              });

                              return Array.from(combined.entries())
                                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                                .map(([name, count]) => (
                                  <option key={name} value={name}>
                                    {name} ({count})
                                  </option>
                                ));
                            })()}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Type:</span>
                          <select 
                            value={selectedNodeType}
                            onChange={(e) => setSelectedNodeType(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-1.5 px-3 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer max-w-[150px] truncate"
                          >
                            <option value="All">All Types</option>
                            {VALID_NODE_TYPES.map(item => (
                              <option key={item.type} value={item.type}>
                                {item.type} ({item.count})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    <button 
                      onClick={() => setViewMode('edit')}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                      <X size={24} className="text-zinc-400" />
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={40} className="text-indigo-600 animate-spin" />
                    <p className="text-zinc-500 font-medium">Fetching your graphs...</p>
                  </div>
                ) : isTrashView ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trashList.map(item => (
                      <div
                        key={item.trashId}
                        className="flex flex-col items-start p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left"
                      >
                        <div className="flex justify-between w-full items-start mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.id}</span>
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Trashed</span>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">{item.title || 'Untitled Graph'}</h3>
                        <p className="text-xs text-zinc-500 mb-4">Deleted on: {new Date(item.deletedAt).toLocaleString()}</p>
                        
                        <div className="mt-auto w-full flex gap-2">
                          <button
                            onClick={() => restoreGraph(item.trashId)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                          >
                            <Plus size={14} />
                            RESTORE
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmationId(item.id);
                            }}
                            className="flex items-center justify-center p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 shadow-sm active:scale-95"
                            title="Delete Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {trashList.length === 0 && (
                      <div className="col-span-full py-20 text-center text-zinc-400">
                        <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Trash is empty.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {graphList.map(graph => (
                      <div
                        key={graph.id}
                        onClick={() => loadGraph(graph.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            loadGraph(graph.id);
                          }
                        }}
                        className={cn(
                          "flex flex-col items-start p-6 rounded-2xl border transition-all text-left group cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500",
                          currentGraphId === graph.id 
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20" 
                            : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex justify-between w-full items-start mb-1">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{graph.id}</span>
                          <div className="flex items-center gap-2">
                            {getMetaArea(graph) && (
                              <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {getMetaArea(graph)}
                              </span>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmationId(graph.id);
                              }}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                              title="Delete Graph"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">{graph.title}</h3>
                        
                        {/* Categories */}
                        {graph.categories && graph.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {graph.categories.map(cat => (
                              <span key={cat} className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50 uppercase tracking-tighter">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Node Types Summary */}
                        {graph.nodeTypes && Object.keys(graph.nodeTypes).length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 w-full">
                            {Object.entries(graph.nodeTypes).map(([type, count]) => (
                              <div key={type} className="flex items-center gap-1">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  type === 'title' ? "bg-indigo-500" :
                                  type === 'notes' ? "bg-amber-500" :
                                  type === 'fulltext' ? "bg-purple-500" :
                                  type === 'image' ? "bg-emerald-500" : "bg-zinc-400"
                                )} />
                                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 capitalize">
                                  {type}: <span className="font-bold text-zinc-700 dark:text-zinc-300">{count}</span>
                                </span>
                              </div>
                            ))}
                            {graph.nodeCount !== undefined && (
                              <div className="ml-auto text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                {graph.nodeCount} Total
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {graphList.length === 0 && (
                      <div className="col-span-full py-20 text-center text-zinc-400">
                        <Database size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No graphs found with the selected filter.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : viewMode === 'json' ? (
              <div className="bg-zinc-900 text-zinc-100 p-8 rounded-3xl font-mono text-sm shadow-2xl border border-zinc-800 flex flex-col h-[calc(100vh-200px)]">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Code size={18} />
                    </div>
                    <span className="text-zinc-100 font-bold uppercase tracking-widest text-xs">Knowledge Graph JSON</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <button 
                      onClick={formatJson}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors border border-zinc-700"
                    >
                      Format
                    </button>
                    <div className="h-4 w-[1px] bg-zinc-800 mx-1" />
                    <button 
                      onClick={() => setViewMode('edit')} 
                      className="text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleApplyJson} 
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      Apply & Preview
                    </button>
                  </div>
                </div>
                <textarea
                  value={jsonValue}
                  onChange={(e) => setJsonValue(e.target.value)}
                  className="flex-1 bg-zinc-950 text-zinc-300 p-4 rounded-xl border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {doc.nodes
                  .filter(node => viewMode === 'edit' || node.visible)
                  .map((node, index) => (
                    <motion.div
                    key={node.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group relative bg-white dark:bg-zinc-900 rounded-3xl border transition-all duration-300",
                      editingNodeId === node.id ? "border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm"
                    )}
                  >
                    {viewMode === 'edit' && (
                      <div className="absolute -left-10 md:-left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveNode(index, 'up')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><ChevronUp size={18} /></button>
                        <button onClick={() => moveNode(index, 'down')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><ChevronDown size={18} /></button>
                      </div>
                    )}

                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-zinc-200/50 dark:border-zinc-700/50">{node.type}</span>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{node.label}</h3>
                        </div>
                        {viewMode === 'edit' && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setDoc(prev => ({
                                  ...prev,
                                  nodes: prev.nodes.map(n => n.id === node.id ? { ...n, visible: !n.visible } : n)
                                }));
                              }}
                              className={cn(
                                "p-2 rounded-xl transition-colors",
                                node.visible ? "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              )}
                              title={node.visible ? "Visible in Preview" : "Hidden in Preview"}
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => setEditingNodeId(node.id)}
                              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteNode(node.id)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-zinc-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <NodeRenderer node={node} />
                        {viewMode === 'edit' && !node.info && (
                          <div className="py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-400">
                            <Plus size={24} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">Click edit to add content</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* Reorder Modal */}
      <ReorderModal />

      {/* Slide-over Editor */}
      <AnimatePresence>
        {editingNodeId && editingNode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingNodeId(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-zinc-950 z-50 shadow-2xl border-l border-zinc-200 dark:border-zinc-800"
            >
              <NodeEditor />
              {isGenerating && (
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-[2px] flex items-center justify-center z-[60]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-indigo-600 animate-pulse uppercase tracking-widest">AI is thinking...</p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Graph Modal */}
      <AnimatePresence>
        {isNewGraphModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Database size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Create New Graph</h2>
                </div>
                <button 
                  onClick={() => setIsNewGraphModalOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Graph Title</label>
                  <input 
                    type="text"
                    autoFocus
                    value={newGraphTitle}
                    onChange={(e) => setNewGraphTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createNewGraph()}
                    placeholder="e.g. History of Rome"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Meta Area</label>
                  <input 
                    type="text"
                    value={newGraphMetaArea}
                    onChange={(e) => setNewGraphMetaArea(e.target.value)}
                    placeholder="e.g. History"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsNewGraphModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createNewGraph}
                    disabled={!newGraphTitle.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    Create Graph
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmationId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                  <Trash2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {isTrashView ? 'Delete Permanently?' : 'Move to Trash?'}
                </h2>
              </div>
              
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                {isTrashView 
                  ? 'Are you sure you want to permanently delete this knowledge graph? This action cannot be undone.'
                  : 'Are you sure you want to move this knowledge graph to the trash? It will be automatically deleted after 30 days.'}
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmationId(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteGraph}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95",
                    isTrashView ? "bg-red-600 hover:bg-red-500 shadow-red-500/20" : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-zinc-500/20"
                  )}
                >
                  {isTrashView ? 'Delete Permanently' : 'Move to Trash'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
