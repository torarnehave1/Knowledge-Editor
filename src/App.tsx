import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, ChevronUp, ChevronDown, Eye, Code, Plus, Save, Wand2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Node, KnowledgeDocument, NodeType } from './types';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import NodeRenderer from './components/NodeRenderer';
import { askGemini } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_DATA: KnowledgeDocument = {
  nodes: [
    {
      id: "c3988290-4c89-4f85-849d-fb0c6a04e5ae",
      label: "Hero Section",
      color: "#f4e2d8",
      type: "notes",
      info: "[FANCY | font-size:18.5em; color:#FFFFFF; background-image:url('https://images.pexels.com/photos/31402193/pexels-photo-31402193.jpeg')]Ancient Wisdom[END FANCY]",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "fulltextNode_20250506",
      label: "Intro to the Seven Hermetic Principles",
      color: "#4a148c",
      type: "fulltext",
      info: "![Header|width:100%;height:300px;object-fit:cover;object-position:center](https://images.pexels.com/photos/30575843/pexels-photo-30575843/free-photo-of-ancient-stone-turtles-in-hoa-l-vietnam.jpeg)\n\n [FANCY | font-size:0.5em; color:#555; text-align: left]Ancient Bas-Relief Art at Angkor Wat<br><small>Photo by <a href='https://www.pexels.com/photo/ancient-bas-relief-art-at-angkor-wat-31402193/'>Karolina</a></small>[END FANCY]\n\n[SECTION | background-color:'#1b1b2f'; color:'#e0e0e0']\nJoin us for a one-hour live introduction to the **Seven Hermetic Principles** — timeless teachings that bridge ancient mysticism and modern consciousness. This immersive session will explore Mentalism, Correspondence, Vibration, Polarity, Rhythm, Cause & Effect, and Gender — keys to mastering inner transformation and cosmic understanding.\n[END SECTION]\n\n[QUOTE | Cited='The Kybalion']The lips of wisdom are closed, except to the ears of Understanding.[END QUOTE]",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "3d-canvas-v4",
      label: "Knowledge Graph Universe — Semantic 3D",
      color: "#38bdf8",
      type: "html-node",
      info: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Knowledge Graph Universe — Cytoscape 2D</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0e1a; }
body { color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
#canvas-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
#loading { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0a0e1a; z-index: 100; transition: opacity 0.5s; }
#loading h1 { font-size: 1.4rem; margin-bottom: 12px; color: #38bdf8; }
#hud { position: fixed; top: 20px; left: 20px; z-index: 10; pointer-events: none; }
#hud h2 { font-size: 1.2rem; color: #38bdf8; margin-bottom: 4px; }
.btn-explore { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10; padding: 12px 24px; border-radius: 9999px; background: #38bdf8; color: #0a0e1a; font-weight: bold; border: none; cursor: pointer; transition: all 0.2s; }
.btn-explore:hover { background: #22a5e0; transform: translateX(-50%) scale(1.05); }
</style>
</head>
<body>
<div id="loading"><h1>Loading Universe...</h1></div>
<div id="hud"><h2>Knowledge Graph Universe</h2><p id="status">Interactive 3D Semantic Map</p></div>
<div id="canvas-container"></div>
<button class="btn-explore" id="explore-btn">Launch Explorer</button>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function() {
  const container = document.getElementById('canvas-container');
  const status = document.getElementById('status');
  const btn = document.getElementById('explore-btn');
  
  btn.onclick = () => {
    status.innerText = "Exploring semantic nodes...";
    status.style.color = "#38bdf8";
    btn.innerText = "Explorer Active";
    btn.style.background = "#22c55e";
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0e1a);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.5, wireframe: true });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(10, 10, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  camera.position.z = 3;

  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setTimeout(() => {
    document.getElementById('loading').style.opacity = '0';
    setTimeout(() => document.getElementById('loading').style.display = 'none', 500);
  }, 1500);

  animate();
})();
</script>
</body>
</html>`,
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    }
  ],
  "edges": []
};

export default function App() {
  const [doc, setDoc] = useState<KnowledgeDocument>(INITIAL_DATA);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'json'>('edit');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddNode = (type: NodeType) => {
    const newNode: Node = {
      id: uuidv4(),
      label: `New ${type} Section`,
      color: '#ffffff',
      type,
      info: '',
      bibl: [],
      imageWidth: '100%',
      imageHeight: '100%',
      visible: true,
      path: null
    };
    setDoc(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setEditingNodeId(newNode.id);
  };

  const handleSaveNode = (updatedNode: Node) => {
    setDoc(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
    }));
    setEditingNodeId(null);
  };

  const handleDeleteNode = (id: string) => {
    setDoc(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id)
    }));
    setEditingNodeId(null);
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const newNodes = [...doc.nodes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newNodes.length) return;
    [newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
    setDoc(prev => ({ ...prev, nodes: newNodes }));
  };

  const handleAskAI = async (id: string, prompt: string) => {
    setIsGenerating(true);
    const node = doc.nodes.find(n => n.id === id);
    const result = await askGemini(prompt, node?.info);
    if (node) {
      setDoc(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === id ? { ...n, info: result } : n)
      }));
    }
    setIsGenerating(false);
  };

  const handlePublish = (node: Node) => {
    // In a real app, this would call an API to publish to a domain
    // For now, we'll simulate it with a console log and a toast-like notification
    console.log(`Publishing node ${node.id} to domain...`);
    alert(`Section "${node.label}" is being published to a custom domain. This feature will be wired to Cloudflare D1 soon!`);
  };

  const editingNode = doc.nodes.find(n => n.id === editingNodeId);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <Sidebar onAddNode={handleAddNode} onShowJson={() => setViewMode('json')} />

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
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'preview' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Eye size={16} />
                Preview
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg shadow-zinc-900/10 active:scale-95">
              <Save size={18} />
              Save Document
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {viewMode === 'json' ? (
              <div className="bg-zinc-900 text-zinc-100 p-8 rounded-3xl font-mono text-sm overflow-x-auto shadow-2xl border border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Document JSON</span>
                  <button onClick={() => setViewMode('edit')} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase tracking-widest">Back to Editor</button>
                </div>
                <pre>{JSON.stringify(doc, null, 2)}</pre>
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
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveNode(index, 'up')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><ChevronUp size={18} /></button>
                      <button onClick={() => moveNode(index, 'down')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><ChevronDown size={18} /></button>
                    </div>

                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-zinc-200/50 dark:border-zinc-700/50">{node.type}</span>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{node.label}</h3>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingNodeId(node.id)}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-zinc-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
              <NodeEditor
                node={editingNode}
                onSave={handleSaveNode}
                onDelete={handleDeleteNode}
                onClose={() => setEditingNodeId(null)}
                onAskAI={handleAskAI}
                onPublish={handlePublish}
              />
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
    </div>
  );
}
