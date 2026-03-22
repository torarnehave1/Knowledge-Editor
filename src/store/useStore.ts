import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Node, KnowledgeDocument, NodeType, GraphListItem, User } from '../types';
import { knowledgeService, MetaAreaItem } from '../services/knowledgeService';
import { askGemini } from '../services/geminiService';

export type ViewMode = 'edit' | 'preview' | 'json' | 'graphs';
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const INITIAL_DATA: KnowledgeDocument = {
  metadata: {
    title: "New Knowledge Graph",
    metaArea: "General"
  },
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
    },
    {
      id: "commentary-demo",
      label: "Commentary Demo",
      color: "#e0f2fe",
      type: "fulltext",
      info: "This is a demonstration of the [COMMENTARY | id='demo-comm']APA-style commentary feature[END COMMENTARY]. You can select any text in the editor and click 'Add Commentary' to create your own scholarly notes.",
      commentaries: [
        {
          id: "demo-comm",
          text: "This feature allows scholars to add deep insights directly to the text while maintaining academic standards.",
          author: "Tor Arne Håve",
          initials: "TAH",
          createdAt: new Date().toISOString()
        }
      ],
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    }
  ],
  edges: []
};

interface AppState {
  // Document State
  doc: KnowledgeDocument;
  currentGraphId: string | null;
  viewMode: ViewMode;
  jsonValue: string;
  
  // Lists & Metadata
  graphList: GraphListItem[];
  trashList: any[];
  metaAreas: MetaAreaItem[];
  searchQuery: string;
  selectedMetaArea: string;
  selectedNodeType: string;
  isTrashView: boolean;
  
  // UI States
  isLoading: boolean;
  isGenerating: boolean;
  saveStatus: SaveStatus;
  error: string | null;
  isNewGraphModalOpen: boolean;
  isReorderModalOpen: boolean;
  newGraphTitle: string;
  newGraphMetaArea: string;
  deleteConfirmationId: string | null;
  editingNodeId: string | null;
  user: User | null;

  // Actions
  setDoc: (doc: KnowledgeDocument | ((prev: KnowledgeDocument) => KnowledgeDocument)) => void;
  setViewMode: (mode: ViewMode) => void;
  setJsonValue: (value: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedMetaArea: (area: string) => void;
  setSelectedNodeType: (type: string) => void;
  setIsTrashView: (isTrash: boolean) => void;
  setError: (error: string | null) => void;
  setIsNewGraphModalOpen: (isOpen: boolean) => void;
  setIsReorderModalOpen: (isOpen: boolean) => void;
  setNewGraphTitle: (title: string) => void;
  setNewGraphMetaArea: (area: string) => void;
  setDeleteConfirmationId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setUser: (user: User | null) => void;

  // Auth Actions
  login: (email: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  bypassLogin: () => void;

  // Async Actions
  fetchGraphs: () => Promise<void>;
  fetchTrash: () => Promise<void>;
  loadGraph: (id: string) => Promise<void>;
  saveGraph: (id?: string) => Promise<void>;
  createNewGraph: () => Promise<void>;
  deleteGraph: () => Promise<void>;
  restoreGraph: (trashId: string) => Promise<void>;
  askAI: (id: string, prompt: string) => Promise<void>;
  
  // Node Operations
  addNode: (type: NodeType) => void;
  saveNode: (updatedNode: Node) => void;
  deleteNode: (id: string) => void;
  moveNode: (index: number, direction: 'up' | 'down') => void;
  setNodes: (nodes: Node[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      doc: INITIAL_DATA,
      currentGraphId: null,
      viewMode: 'edit',
      jsonValue: '',
      graphList: [],
      trashList: [],
      metaAreas: [],
      searchQuery: '',
      selectedMetaArea: 'All',
      selectedNodeType: 'All',
      isTrashView: false,
      isLoading: false,
      isGenerating: false,
      saveStatus: 'idle',
      error: null,
      isNewGraphModalOpen: false,
      isReorderModalOpen: false,
      newGraphTitle: '',
      newGraphMetaArea: 'General',
      deleteConfirmationId: null,
      editingNodeId: null,
      user: null,

      setDoc: (updater) => {
        if (typeof updater === 'function') {
          set((state) => ({ doc: updater(state.doc) }));
        } else {
          set({ doc: updater });
        }
      },
      setViewMode: (viewMode) => set({ viewMode }),
      setJsonValue: (jsonValue) => set({ jsonValue }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedMetaArea: (selectedMetaArea) => set({ selectedMetaArea }),
      setSelectedNodeType: (selectedNodeType) => set({ selectedNodeType }),
      setIsTrashView: (isTrashView) => set({ isTrashView }),
      setError: (error) => set({ error }),
      setIsNewGraphModalOpen: (isNewGraphModalOpen) => set({ isNewGraphModalOpen }),
      setIsReorderModalOpen: (isReorderModalOpen) => set({ isReorderModalOpen }),
      setNewGraphTitle: (newGraphTitle) => set({ newGraphTitle }),
      setNewGraphMetaArea: (newGraphMetaArea) => set({ newGraphMetaArea }),
      setDeleteConfirmationId: (deleteConfirmationId) => set({ deleteConfirmationId }),
      setEditingNodeId: (editingNodeId) => set({ editingNodeId }),
      setUser: (user) => set({ user }),

      login: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('https://cookie.vegvisr.org/login/magic/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, redirectUrl: window.location.href }),
          });
          if (!response.ok) throw new Error('Failed to send magic link');
        } catch (e) {
          console.error(e);
          set({ error: 'Failed to send magic link' });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('user');
        set({ user: null });
      },

      bypassLogin: () => {
        const mockUser: User = {
          email: 'dev@vegvisr.org',
          role: 'admin',
          user_id: 'dev-user-id',
          emailVerificationToken: 'dev-token'
        };
        localStorage.setItem('user', JSON.stringify(mockUser));
        set({ user: mockUser });
      },

      checkAuth: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const magicToken = urlParams.get('magic');

        if (magicToken) {
          set({ isLoading: true });
          try {
            const verifyRes = await fetch(`https://cookie.vegvisr.org/login/magic/verify?token=${magicToken}`);
            const verifyData = await verifyRes.json();

            if (verifyData.success && verifyData.email) {
              const email = verifyData.email;
              
              const [roleRes, userDataRes] = await Promise.all([
                fetch(`https://dashboard.vegvisr.org/get-role?email=${email}`),
                fetch(`https://dashboard.vegvisr.org/userdata?email=${email}`)
              ]);

              const roleData = await roleRes.json();
              const userData = await userDataRes.json();

              const user: User = {
                email,
                role: roleData.role,
                user_id: userData.user_id,
                emailVerificationToken: magicToken
              };

              localStorage.setItem('user', JSON.stringify(user));
              set({ user });
              
              // Clean URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (e) {
            console.error('Auth verification failed:', e);
            set({ error: 'Authentication failed' });
          } finally {
            set({ isLoading: false });
          }
        } else {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              set({ user: JSON.parse(storedUser) });
            } catch (e) {
              localStorage.removeItem('user');
            }
          }
        }
      },

      fetchGraphs: async () => {
        set({ isLoading: true });
        try {
          const { searchQuery, selectedMetaArea, selectedNodeType } = get();
          let list: GraphListItem[] = [];
          
          // If we have a query OR a node type filter, use searchGraphs
          if (searchQuery.trim() || (selectedNodeType && selectedNodeType !== 'All')) {
            list = await knowledgeService.searchGraphs(searchQuery, selectedNodeType);
          } else {
            list = await knowledgeService.listGraphs(selectedMetaArea);
          }
          set({ graphList: list });
          
          try {
            const areas = await knowledgeService.listMetaAreas();
            set({ metaAreas: areas });
          } catch (e) {
            console.warn('Failed to fetch meta areas:', e);
          }
        } catch (e) {
          console.error('Failed to fetch graphs:', e);
          set({ error: 'Failed to fetch graphs' });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchTrash: async () => {
        set({ isLoading: true });
        try {
          const list = await knowledgeService.getTrash();
          set({ trashList: list });
        } catch (e) {
          console.error('Failed to fetch trash:', e);
          set({ error: 'Failed to fetch trash' });
        } finally {
          set({ isLoading: false });
        }
      },

      loadGraph: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const data = await knowledgeService.getGraph(id);
          set({ doc: data, currentGraphId: id, viewMode: 'edit' });
        } catch (e) {
          console.error(e);
          set({ error: 'Failed to load graph' });
        } finally {
          set({ isLoading: false });
        }
      },

      saveGraph: async (id) => {
        const targetId = id || get().currentGraphId;
        if (!targetId) {
          const newId = uuidv4();
          set({ currentGraphId: newId });
          return get().saveGraph(newId);
        }

        set({ saveStatus: 'saving' });
        try {
          await knowledgeService.saveGraph(targetId, get().doc, true);
          set({ saveStatus: 'success' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        } catch (e) {
          console.error(e);
          set({ saveStatus: 'error' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        }
      },

      createNewGraph: async () => {
        const { newGraphTitle, newGraphMetaArea } = get();
        if (!newGraphTitle.trim()) return;

        const newId = uuidv4();
        const newDoc: KnowledgeDocument = {
          metadata: {
            title: newGraphTitle,
            metaArea: newGraphMetaArea
          },
          nodes: [
            {
              id: uuidv4(),
              label: "Introduction",
              color: "#f4e2d8",
              type: "notes",
              info: "Start your research here...",
              bibl: [],
              imageWidth: '100%',
              imageHeight: '100%',
              visible: true,
              path: null
            }
          ],
          edges: []
        };

        set({ 
          doc: newDoc, 
          currentGraphId: newId, 
          isNewGraphModalOpen: false, 
          newGraphTitle: '', 
          viewMode: 'edit' 
        });
        
        await get().saveGraph(newId);
      },

      deleteGraph: async () => {
        const id = get().deleteConfirmationId;
        if (!id) return;

        set({ isLoading: true, error: null });
        try {
          await knowledgeService.deleteGraph(id);
          if (get().isTrashView) {
            set((state) => ({ trashList: state.trashList.filter(item => item.id !== id) }));
          } else {
            set((state) => ({ graphList: state.graphList.filter(g => g.id !== id) }));
          }
          
          if (get().currentGraphId === id) {
            set({ currentGraphId: null, doc: INITIAL_DATA });
          }
          set({ deleteConfirmationId: null });
        } catch (e) {
          console.error(e);
          set({ error: 'Failed to delete graph' });
        } finally {
          set({ isLoading: false });
        }
      },

      restoreGraph: async (trashId) => {
        set({ isLoading: true, error: null });
        try {
          await knowledgeService.restoreGraph(trashId);
          set((state) => ({ trashList: state.trashList.filter(item => item.trashId !== trashId) }));
        } catch (e) {
          console.error(e);
          set({ error: 'Failed to restore graph' });
        } finally {
          set({ isLoading: false });
        }
      },

      askAI: async (id, prompt) => {
        set({ isGenerating: true });
        try {
          const node = get().doc.nodes.find(n => n.id === id);
          const result = await askGemini(prompt, node?.info);
          if (node) {
            set((state) => ({
              doc: {
                ...state.doc,
                nodes: state.doc.nodes.map(n => n.id === id ? { ...n, info: result } : n)
              }
            }));
          }
        } catch (e) {
          console.error(e);
          set({ error: 'AI generation failed' });
        } finally {
          set({ isGenerating: false });
        }
      },

      addNode: (type) => {
        const newNode: Node = {
          id: uuidv4(),
          label: type === 'youtube-video' ? 'YouTube Video' : `New ${type} Section`,
          color: type === 'youtube-video' ? '#FF0000' : '#ffffff',
          type,
          info: '',
          bibl: [],
          imageWidth: '100%',
          imageHeight: '100%',
          visible: true,
          path: null
        };
        set((state) => ({
          doc: { ...state.doc, nodes: [...state.doc.nodes, newNode] },
          editingNodeId: newNode.id
        }));
      },

      saveNode: (updatedNode) => {
        set((state) => ({
          doc: {
            ...state.doc,
            nodes: state.doc.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
          },
          editingNodeId: null
        }));
      },

      deleteNode: (id) => {
        set((state) => ({
          doc: {
            ...state.doc,
            nodes: state.doc.nodes.filter(n => n.id !== id)
          },
          editingNodeId: null
        }));
      },

      moveNode: (index, direction) => {
        set((state) => {
          const newNodes = [...state.doc.nodes];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= newNodes.length) return state;
          [newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
          return { doc: { ...state.doc, nodes: newNodes } };
        });
      },

      setNodes: (nodes) => set((state) => ({ doc: { ...state.doc, nodes } })),
    }),
    {
      name: 'knowledge-graph-storage',
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        selectedMetaArea: state.selectedMetaArea,
        selectedNodeType: state.selectedNodeType,
        searchQuery: state.searchQuery
      }),
    }
  )
);
