import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Node, KnowledgeDocument, NodeType, GraphListItem, User, Agent, AgentMessage, AgentLog } from '../types';
import { knowledgeService, MetaAreaItem } from '../services/knowledgeService';
import { askGemini } from '../services/geminiService';
import { chatWithAgent, generateAgentAvatar } from '../services/agentService';
import { workerAIService } from '../services/workerAIService';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return uuidv4();
};

export type ViewMode = 'edit' | 'preview' | 'json' | 'graphs';
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const INITIAL_DATA: KnowledgeDocument = {
  metadata: {
    title: "Soundarya Lahari - Verse 32",
    description: "The Secret of the Panchadashakshari Mantra (Kadi Vidya)",
    metaArea: "Spiritual / Tantra / Sanskrit Literature",
    createdBy: "Knowledge Editor",
    version: 1
  },
  nodes: [
    {
      id: "hero-section-node",
      label: "Hero Section",
      color: "#FFD700",
      type: "notes",
      info: "[FANCY | font-size:6.5em; color:#FFD700; background-image:url('https://images.pexels.com/photos/2072453/pexels-photo-2072453.jpeg')]Verse 32: Kadi Vidya[END FANCY]",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "the-verse-node",
      label: "The Verse",
      color: "#4a148c",
      type: "fulltext",
      info: "## Śivaḥ śaktiḥ kāmaḥ kṣitira-tha raviḥ śītakiraṇaḥ smaro haṃsaḥ śakrastadanu ca parā-māra-harayaḥ...\n\nThis verse uses code words (**Sanketa**) to reveal the 15 syllables of the Srividya Mantra without explicitly naming them.\n\n### Sanketa (Coding)\nThe verse uses \"Shiva\" to mean the letter **Ka**, \"Shakti\" for **E**, \"Kama\" for **I**, and \"Kshiti\" for **La**.",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "panchadashakshari-mantra-node",
      label: "Panchadashakshari Mantra",
      color: "#FFD700",
      type: "notes",
      info: "The 15-lettered mantra divided into three sections (**Kutas**):\n\n1. **Vagbhava Kuta**: Ka-E-I-La-Hrim\n2. **Kamaraja Kuta**: Ha-Sa-Ka-Ha-La-Hrim\n3. **Shakti Kuta**: Sa-Ka-La-Hrim",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "adi-shankara-node",
      label: "Adi Shankara",
      color: "#f4e2d8",
      type: "notes",
      info: "The traditional author of **Soundarya Lahari**, credited with systematizing the worship of the Divine Mother.",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "kadi-vidya-school-node",
      label: "Kadi Vidya School",
      color: "#38bdf8",
      type: "notes",
      info: "The lineage of Srividya that begins the mantra with the letter '**Ka**' (representing Shiva/Brahma).",
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "symbolic-elements-node",
      label: "Symbolic Elements",
      color: "#1a1a1a",
      type: "html-node",
      info: `<!DOCTYPE html> <html> <body style="background-color:#1a1a1a; color:#f0e68c; padding:10px; font-family:serif;"> <h3>Encoded Deities/Elements:</h3> <ul> <li><b>Shiva:</b> The letter 'Ka'</li> <li><b>Shakti:</b> The letter 'E'</li> <li><b>Kama:</b> The letter 'I'</li> <li><b>Kshiti (Earth):</b> The letter 'La'</li> <li><b>Hrim:</b> The Bija syllable ending each section.</li> </ul> </body> </html>`,
      bibl: [],
      imageWidth: "100%",
      imageHeight: "100%",
      visible: true,
      path: null
    },
    {
      id: "esoteric-commentary-node",
      label: "Esoteric Commentary",
      color: "#e0f2fe",
      type: "fulltext",
      info: "This is a demonstration of the [COMMENTARY | id='tantra-comm']Srividya Exegesis[/COMMENTARY]. Verse 32 is considered the \"Mantra Uddhara Sloka,\" providing the blueprint for the practitioner's meditation on the Devi's sound-body.",
      commentaries: [
        {
          id: "tantra-comm",
          text: "The Srividya tradition emphasizes the identity between the mantra, the deity, and the practitioner's own consciousness.",
          author: "Knowledge Editor",
          initials: "KE",
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
  edges: [
    { id: "e1", source: "the-verse-node", target: "panchadashakshari-mantra-node", label: "Encodes" },
    { id: "e2", source: "adi-shankara-node", target: "the-verse-node", label: "Authored" },
    { id: "e3", source: "the-verse-node", target: "kadi-vidya-school-node", label: "Belongs To" },
    { id: "e4", source: "panchadashakshari-mantra-node", target: "symbolic-elements-node", label: "Composed Of" },
    { id: "e5", source: "the-verse-node", target: "esoteric-commentary-node", label: "Contains" }
  ]
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
  historyError: string | null;
  isNewGraphModalOpen: boolean;
  isReorderModalOpen: boolean;
  isSEOModalOpen: boolean;
  isVersionHistoryModalOpen: boolean;
  isTranslationModalOpen: boolean;
  seoStatus: 'idle' | 'generating' | 'success' | 'error';
  translationStatus: 'idle' | 'translating' | 'success' | 'error';
  translationProgress: number;
  seoUrl: string | null;
  newGraphTitle: string;
  newGraphMetaArea: string;
  deleteConfirmationId: string | null;
  editingNodeId: string | null;
  user: User | null;
  defaultGraphId: string | null;
  versionHistory: { version: number; timestamp: string }[];
  
  // Agent State
  agents: Agent[];
  agentMessages: AgentMessage[];
  activeAgentId: string | null;
  isAgentModalOpen: boolean;
  isAgentChatOpen: boolean;
  
  // AI Settings
  aiProvider: string;
  aiModel: string;
  availableModels: Record<string, { id: string; name: string; description?: string }[]>;
  availableEndpoints: { path: string; method: string; summary?: string; description?: string }[];

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
  setIsSEOModalOpen: (isOpen: boolean) => void;
  setIsVersionHistoryModalOpen: (isOpen: boolean) => void;
  setIsTranslationModalOpen: (isOpen: boolean) => void;
  setNewGraphTitle: (title: string) => void;
  setNewGraphMetaArea: (area: string) => void;
  setDeleteConfirmationId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setUser: (user: User | null) => void;
  setDefaultGraph: (id: string | null) => void;
  setAiProvider: (provider: string) => void;
  setAiModel: (model: string) => void;
  setVersionHistory: (history: { version: number; timestamp: string }[]) => void;
  setAgents: (agents: Agent[]) => void;
  setActiveAgentId: (id: string | null) => void;
  setIsAgentModalOpen: (isOpen: boolean) => void;
  setIsAgentChatOpen: (isOpen: boolean) => void;

  // Auth Actions
  login: (email: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  bypassLogin: () => void;

  // Async Actions
  fetchGraphs: () => Promise<void>;
  fetchTrash: () => Promise<void>;
  fetchVersionHistory: () => Promise<void>;
  loadGraph: (id: string) => Promise<void>;
  saveGraph: (id?: string) => Promise<void>;
  createNewGraph: () => Promise<void>;
  deleteGraph: () => Promise<void>;
  restoreGraph: (trashId: string) => Promise<void>;
  restoreVersion: (version: number) => Promise<void>;
  askAI: (id: string, prompt: string) => Promise<void>;
  translateGraph: (targetLanguage: string) => Promise<void>;
  generateSEODescription: (title: string) => Promise<string>;
  generateSEOKeywords: (title: string) => Promise<string>;
  publishSEOPage: (seoData: { slug: string; title: string; description: string; ogImage: string; keywords: string }) => Promise<void>;
  fetchAvailableModels: () => Promise<void>;
  fetchEndpoints: () => Promise<void>;
  
  // Agent Actions
  createAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  updateAgent: (agent: Agent) => Promise<void>;
  deleteAgent: (id: string) => void;
  sendAgentMessage: (content: string) => Promise<void>;
  clearAgentChat: () => void;
  generateAvatar: (name: string, description: string) => Promise<string>;
  
  // Node Operations
  addNode: (type: NodeType, initialData?: Partial<Node>) => Node;
  saveNode: (updatedNode: Node) => void;
  deleteNode: (id: string) => void;
  toggleNodeVisibility: (id: string) => void;
  moveNode: (index: number, direction: 'up' | 'down') => void;
  setNodes: (nodes: Node[]) => void;
  updateMetadata: (data: Partial<KnowledgeDocument['metadata']>) => void;
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
      historyError: null,
      isNewGraphModalOpen: false,
      isReorderModalOpen: false,
      isSEOModalOpen: false,
      isVersionHistoryModalOpen: false,
      isTranslationModalOpen: false,
      seoStatus: 'idle',
      translationStatus: 'idle',
      translationProgress: 0,
      seoUrl: null,
      newGraphTitle: '',
      newGraphMetaArea: 'General',
      deleteConfirmationId: null,
      editingNodeId: null,
      user: null,
      defaultGraphId: localStorage.getItem('defaultGraphId'),
      versionHistory: [],
      agents: [],
      agentMessages: [],
      activeAgentId: null,
      isAgentModalOpen: false,
      isAgentChatOpen: false,
      aiProvider: 'gemma',
      aiModel: '@cf/google/gemma-4-26b-a4b-it',
      availableModels: {},
      availableEndpoints: [],

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
      setIsSEOModalOpen: (isSEOModalOpen) => set({ isSEOModalOpen, seoStatus: 'idle', seoUrl: null }),
      setIsVersionHistoryModalOpen: (isVersionHistoryModalOpen) => set({ isVersionHistoryModalOpen }),
      setIsTranslationModalOpen: (isTranslationModalOpen) => set({ isTranslationModalOpen, translationStatus: 'idle', translationProgress: 0 }),
      setNewGraphTitle: (newGraphTitle) => set({ newGraphTitle }),
      setNewGraphMetaArea: (newGraphMetaArea) => set({ newGraphMetaArea }),
      setDeleteConfirmationId: (deleteConfirmationId) => set({ deleteConfirmationId }),
      setEditingNodeId: (editingNodeId) => set({ editingNodeId }),
      setUser: (user) => set({ user }),
      setDefaultGraph: (id) => {
        if (id) {
          localStorage.setItem('defaultGraphId', id);
        } else {
          localStorage.removeItem('defaultGraphId');
        }
        set({ defaultGraphId: id });
      },
      setAiProvider: (aiProvider) => {
        const { availableModels } = get();
        const models = availableModels[aiProvider] || [];
        set({ aiProvider, aiModel: models[0]?.id || '' });
      },
      setAiModel: (aiModel) => set({ aiModel }),
      setVersionHistory: (versionHistory) => set({ versionHistory }),
      setAgents: (agents) => set({ agents }),
      setActiveAgentId: (activeAgentId) => set({ activeAgentId }),
      setIsAgentModalOpen: (isAgentModalOpen) => set({ isAgentModalOpen }),
      setIsAgentChatOpen: (isAgentChatOpen) => set({ isAgentChatOpen }),

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
        localStorage.removeItem('emailVerificationToken');
        set({ user: null });
      },

      bypassLogin: () => {
        const mockUser: User = {
          email: 'dev@vegvisr.org',
          role: 'admin',
          user_id: 'dev-user-id',
          emailVerificationToken: import.meta.env.VITE_VEGVISR_API_TOKEN || 'b1ca2967e8165ec02fdf039d9e916af4005f7388'
        };
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('emailVerificationToken', mockUser.emailVerificationToken);
        set({ user: mockUser });
      },

      checkAuth: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const magicToken = urlParams.get('magic');

        if (magicToken) {
          set({ isLoading: true });
          try {
            // Step 1: Verify the magic link
            const verifyRes = await fetch(`https://cookie.vegvisr.org/login/magic/verify?token=${magicToken}`);
            const verifyData = await verifyRes.json();

            if (verifyData.success && verifyData.email) {
              const email = verifyData.email;
              
              // Step 2: Get the REAL permanent token and user_id from the new backend
              const tokenRes = await fetch('https://api.vegvisr.org/get-auth-token', {
                method: 'GET',
                headers: {
                  'X-Email': email
                }
              });
              
              if (!tokenRes.ok) throw new Error('Failed to get auth token');
              const tokenData = await tokenRes.json();
              
              // Step 3: Get role
              const roleRes = await fetch(`https://dashboard.vegvisr.org/get-role?email=${email}`);
              const roleData = await roleRes.json();

              const user: User = {
                email,
                role: roleData.role,
                user_id: tokenData.user_id,
                emailVerificationToken: tokenData.emailVerificationToken
              };

              localStorage.setItem('user', JSON.stringify(user));
              localStorage.setItem('emailVerificationToken', tokenData.emailVerificationToken);
              set({ user });
              
              // Load default graph if exists
              const defaultId = get().defaultGraphId;
              if (defaultId) {
                get().loadGraph(defaultId);
              }

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
              const user = JSON.parse(storedUser);
              set({ user });
              if (user.emailVerificationToken) {
                localStorage.setItem('emailVerificationToken', user.emailVerificationToken);
              }
              
              // Load default graph if exists
              const defaultId = get().defaultGraphId;
              if (defaultId && !get().currentGraphId) {
                get().loadGraph(defaultId);
              }
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

      fetchVersionHistory: async () => {
        const id = get().currentGraphId;
        if (!id) return;
        set({ isLoading: true, historyError: null });
        try {
          const history = await knowledgeService.getGraphHistory(id);
          set({ versionHistory: history });
        } catch (e: any) {
          console.error('Failed to fetch version history:', e);
          set({ historyError: e.message || 'Failed to fetch version history' });
        } finally {
          set({ isLoading: false });
        }
      },

      loadGraph: async (id) => {
        set({ isLoading: true, error: null, currentGraphId: id });
        try {
          const data = await knowledgeService.getGraph(id);
          set({ doc: data, viewMode: 'edit' });
        } catch (e: any) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          
          if (errorMsg === 'GRAPH_CORRUPTED' || errorMsg.includes('GRAPH_CORRUPTED')) {
            console.warn('Load Graph: Graph is corrupted, starting repair...');
            set({ error: 'Graph data is corrupted. Fetching history for repair...' });
            try {
              const history = await knowledgeService.getGraphHistory(id);
              if (history && history.length > 0) {
                set({ versionHistory: history });
                
                // Try versions from newest to oldest until one works
                let repairSuccess = false;
                for (const h of history) {
                  try {
                    console.log(`Attempting to recover version ${h.version}...`);
                    const versionData = await knowledgeService.getGraphVersion(id, h.version);
                    // Basic validation: must have nodes array
                    if (versionData && Array.isArray(versionData.nodes)) {
                      await knowledgeService.saveGraph(id, versionData, true);
                      set({ 
                        doc: versionData, 
                        viewMode: 'edit', 
                        error: `Graph successfully recovered from version ${h.version}.` 
                      });
                      setTimeout(() => set({ error: null }), 5000);
                      repairSuccess = true;
                      break;
                    }
                  } catch (vErr: any) {
                    const vErrMsg = vErr instanceof Error ? vErr.message : String(vErr);
                    console.warn(`Version ${h.version} recovery failed:`, vErrMsg);
                  }
                }

                if (!repairSuccess) {
                  set({ 
                    error: 'Auto-repair failed. Please select a version manually from the history.',
                    isVersionHistoryModalOpen: true 
                  });
                }
              } else {
                set({ error: 'Graph is corrupted and no version history was found to recover from.' });
              }
            } catch (historyError) {
              console.error('Failed to fetch history during repair:', historyError);
              set({ error: 'Graph is corrupted and version history could not be retrieved.' });
            }
          } else {
            set({ error: errorMsg || 'Failed to load graph' });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      saveGraph: async (id) => {
        const targetId = id || get().currentGraphId;
        if (!targetId) {
          const newId = generateUUID();
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

        const newId = generateUUID();
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

      restoreVersion: async (version) => {
        const id = get().currentGraphId;
        if (!id) return;
        set({ isLoading: true, error: null });
        try {
          const versionData = await knowledgeService.getGraphVersion(id, version);
          await knowledgeService.saveGraph(id, versionData, true);
          set({ doc: versionData, isVersionHistoryModalOpen: false });
          set({ saveStatus: 'success' });
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        } catch (e) {
          console.error('Failed to restore version:', e);
          set({ error: 'Failed to restore version' });
        } finally {
          set({ isLoading: false });
        }
      },

      askAI: async (id, prompt) => {
        set({ isGenerating: true });
        try {
          const { aiProvider, aiModel } = get();
          const node = get().doc.nodes.find(n => n.id === id);
          const result = await askGemini(prompt, node?.info, aiProvider, aiModel);
          if (node) {
            set((state) => ({
              doc: {
                ...state.doc,
                nodes: state.doc.nodes.map(n => n.id === id ? { ...n, info: result } : n)
              }
            }));
            
            // Auto-save
            if (get().currentGraphId) {
              get().saveGraph();
            }
          }
        } catch (e: any) {
          console.error(e);
          set({ error: e.message || 'AI generation failed' });
        } finally {
          set({ isGenerating: false });
        }
      },

      translateGraph: async (targetLanguage) => {
        const { doc, aiProvider, aiModel, saveGraph } = get();
        set({ translationStatus: 'translating', translationProgress: 0 });
        
        try {
          const totalNodes = doc.nodes.length;
          const translatedNodes = [];
          
          // 1. Translate Metadata Title
          const titlePrompt = `Translate this title into ${targetLanguage}: "${doc.metadata.title}". Return ONLY the translated title.`;
          const translatedTitle = await askGemini(titlePrompt, null, aiProvider, aiModel, "You are a professional translator.");
          
          // 2. Translate Nodes
          for (let i = 0; i < totalNodes; i++) {
            const node = doc.nodes[i];
            
            // Translate Label
            const labelPrompt = `Translate this node label into ${targetLanguage}: "${node.label}". Return ONLY the translated label.`;
            const translatedLabel = await askGemini(labelPrompt, null, aiProvider, aiModel, "You are a professional translator.");
            
            // Translate Info (with tag protection)
            let translatedInfo = node.info;
            if (node.info && node.type !== 'html-node') {
              const infoPrompt = `Translate the following Markdown content into ${targetLanguage}. 
              
              CRITICAL: Do NOT translate or modify any text inside square brackets like [FANCY | ...], [SECTION | ...], [QUOTE | ...], [COMMENTARY | ...], or [YOUTUBE src=...]. 
              Only translate the human-readable content surrounding these tags. 
              Maintain all Markdown formatting.
              
              Content:
              ${node.info}`;
              
              translatedInfo = await askGemini(infoPrompt, null, aiProvider, aiModel, "You are a professional translator specialized in technical Markdown and custom tags.");
            }
            
            translatedNodes.push({
              ...node,
              label: translatedLabel.trim(),
              info: translatedInfo
            });
            
            set({ translationProgress: Math.round(((i + 1) / totalNodes) * 100) });
          }
          
          // 3. Create New Graph
          const newId = generateUUID();
          const newDoc: KnowledgeDocument = {
            ...doc,
            metadata: {
              ...doc.metadata,
              title: `${translatedTitle.trim()} [${targetLanguage.toUpperCase()}]`,
            },
            nodes: translatedNodes
          };
          
          // 4. Save and Switch
          await knowledgeService.saveGraph(newId, newDoc, true);
          set({ 
            doc: newDoc, 
            currentGraphId: newId, 
            translationStatus: 'success',
            viewMode: 'edit'
          });
          
          // Refresh list
          get().fetchGraphs();
          
          setTimeout(() => set({ translationStatus: 'idle', isTranslationModalOpen: false }), 3000);
        } catch (e: any) {
          console.error('Translation failed:', e);
          set({ translationStatus: 'error', error: e.message || 'Translation failed' });
        }
      },

      generateSEODescription: async (title) => {
        const { doc } = get();
        // Extract some content from nodes for better context
        const nodeContent = doc.nodes
          .filter(n => n.visible && n.info)
          .slice(0, 5)
          .map(n => n.info)
          .join('\n')
          .substring(0, 1000);

        const prompt = `Generate a compelling SEO meta description (max 160 characters) for a knowledge graph titled: "${title}". 
        
        Here is some content from the graph for context:
        ${nodeContent}
        
        Focus on keywords and engagement. Return ONLY the description text.`;
        
        const systemPrompt = "You are an SEO expert. Your goal is to write high-converting meta descriptions that improve CTR and search rankings. Be concise, use active voice, and include relevant keywords.";

        try {
          // Use grok provider and grok-3 model as requested
          let result: string;
          try {
            result = await askGemini(prompt, null, 'grok', 'grok-3', systemPrompt);
          } catch (aiError) {
            console.warn('Grok-3 failed, falling back to Grok-2:', aiError);
            try {
              result = await askGemini(prompt, null, 'grok', 'grok-2', systemPrompt);
            } catch (aiError2) {
              console.warn('Grok-2 failed, falling back to Gemini:', aiError2);
              result = await askGemini(prompt, null, 'gemini', 'gemini-2.5-flash', systemPrompt);
            }
          }
          
          const cleanDesc = result.trim().replace(/^["']|["']$/g, '');
          
          // Update the doc metadata with the new description
          const updatedMetadata = {
            ...get().doc.metadata,
            seoDescription: cleanDesc
          };

          set((state) => ({
            doc: {
              ...state.doc,
              metadata: updatedMetadata as any
            }
          }));

          // Persist to backend if we have a graph ID
          const { currentGraphId, saveGraph } = get();
          if (currentGraphId) {
            try {
              await saveGraph();
            } catch (updateError) {
              console.error('Failed to update graph metadata after AI generation:', updateError);
              // We still return the description so the user can see it in the UI
            }
          }
          
          return cleanDesc;
        } catch (e: any) {
          console.error('Failed to generate SEO description:', e);
          throw new Error(`Failed to generate SEO description: ${e.message}`);
        }
      },

      generateSEOKeywords: async (title) => {
        const { doc } = get();
        const nodeContent = doc.nodes
          .filter(n => n.visible && n.label)
          .slice(0, 10)
          .map(n => n.label)
          .join(', ');

        const prompt = `Generate 5-10 relevant SEO keywords (comma-separated) for a knowledge graph titled: "${title}".
        
        Key topics in the graph: ${nodeContent}
        
        Return ONLY the comma-separated keywords.`;
        
        const systemPrompt = "You are an SEO expert. Provide a concise list of high-value, relevant keywords for search engine optimization.";

        try {
          let result: string;
          try {
            result = await askGemini(prompt, null, 'grok', 'grok-3', systemPrompt);
          } catch (aiError) {
            result = await askGemini(prompt, null, 'gemini', 'gemini-2.5-flash', systemPrompt);
          }
          
          const cleanKeywords = result.trim().replace(/^["']|["']$/g, '');
          return cleanKeywords;
        } catch (e: any) {
          console.error('Failed to generate SEO keywords:', e);
          return '';
        }
      },

      publishSEOPage: async (seoData) => {
        const { currentGraphId, doc } = get();
        if (!currentGraphId) return;

        set({ seoStatus: 'generating' });
        try {
          // 1. Generate the static page
          const payload = {
            graphId: currentGraphId,
            ...seoData,
            graphData: doc,
            createdByApp: "knowledge-editor"
          };
          const genResult = await knowledgeService.generateSEOPage(payload);

          // 2. Update graph metadata
          const updatedMetadata = {
            ...doc.metadata,
            seoSlug: seoData.slug,
            seoDescription: seoData.description,
            seoOgImage: seoData.ogImage,
            seoKeywords: seoData.keywords,
            publicationState: 'published'
          };

          await get().saveGraph();

          // 3. Update local state
          set((state) => ({
            doc: {
              ...state.doc,
              metadata: updatedMetadata as any
            },
            seoStatus: 'success',
            seoUrl: genResult.url
          }));
        } catch (e: any) {
          console.error('SEO Publication failed:', e);
          set({ seoStatus: 'error', error: e.message || 'Failed to publish SEO page' });
        }
      },

      fetchAvailableModels: async () => {
        try {
          const userToken = localStorage.getItem('emailVerificationToken');
          const response = await fetch('https://api.vegvisr.org/worker-ai/models', {
            headers: {
              'X-API-Token': userToken || ''
            }
          });
          if (!response.ok) throw new Error('Failed to fetch models');
          const data = await response.json();
          const models = data.models || {};
          set({ availableModels: models });
          
          // Migrate persisted provider/model no longer offered by the backend
          const { aiProvider, aiModel } = get();
          if (!models[aiProvider]) {
            const firstProvider = Object.keys(models)[0];
            if (firstProvider) {
              set({ aiProvider: firstProvider, aiModel: models[firstProvider][0]?.id || '' });
            }
          } else if (!aiModel || !models[aiProvider].some((m: any) => m.id === aiModel)) {
            set({ aiModel: models[aiProvider][0]?.id || '' });
          }
        } catch (e) {
          console.error('Failed to fetch models:', e);
          // Fallback to some defaults if API fails
          set({
            availableModels: {
              gemini: [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
              ],
              openai: [
                { id: 'gpt-4o', name: 'GPT-4o' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
              ],
              anthropic: [
                { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
                { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
                { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' }
              ],
              grok: [
                { id: 'grok-3', name: 'Grok-3' },
                { id: 'grok-2', name: 'Grok-2' }
              ]
            }
          });
        }
      },

      fetchEndpoints: async () => {
        try {
          const spec = await knowledgeService.fetchOpenApiSpec();
          const endpoints: any[] = [];
          
          if (spec && spec.paths) {
            Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
              Object.entries(methods).forEach(([method, details]: [string, any]) => {
                endpoints.push({
                  path,
                  method: method.toUpperCase(),
                  summary: details.summary,
                  description: details.description
                });
              });
            });
          }
          
          set({ availableEndpoints: endpoints });
        } catch (e) {
          console.error('Failed to fetch endpoints:', e);
        }
      },

      // Agent Actions
      createAgent: async (agentData) => {
        const newAgent: Agent = {
          ...agentData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ agents: [...state.agents, newAgent] }));
      },

      updateAgent: async (updatedAgent) => {
        set((state) => ({
          agents: state.agents.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)),
        }));
      },

      deleteAgent: (id) => {
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== id),
          activeAgentId: state.activeAgentId === id ? null : state.activeAgentId,
          isAgentChatOpen: state.activeAgentId === id ? false : state.isAgentChatOpen,
        }));
      },

      sendAgentMessage: async (content: string) => {
        const { activeAgentId, agents } = get();
        const agent = agents.find((a) => a.id === activeAgentId);
        if (!agent) return;

        const userMessage: AgentMessage = {
          id: uuidv4(),
          agentId: agent.id,
          role: 'user',
          content,
          timestamp: Date.now(),
          logs: []
        };

        set((state) => ({
          agentMessages: [...state.agentMessages, userMessage],
          isLoading: true,
          error: null
        }));

        const currentTurnLogs: AgentLog[] = [];
        let currentMessages = get().agentMessages.filter(m => m.agentId === agent.id);
        let finalResponse = "";
        let steps = 0;
        const maxSteps = 5;
        let lastResponse = "";

        try {
          while (steps < maxSteps) {
            steps++;
            const { doc } = get();
            
            // 1. Get agent response
            const response = await chatWithAgent(agent, currentMessages, doc);
            
            // Loop detection: if response is identical to last one, break
            if (response === lastResponse) break;
            lastResponse = response;
            
            finalResponse = response;

            // 2. Log thought
            currentTurnLogs.push({
              id: uuidv4(),
              timestamp: Date.now(),
              type: 'thought',
              content: response.replace(/\[ACTION:[\s\S]*?\]/g, '').trim() || "Analyzing request..."
            });

            // 3. Parse and execute actions
            const actionRegex = /\[ACTION:\s*({[\s\S]*?})\]/g;
            let match;
            const actionResults: string[] = [];
            let hadActions = false;

            while ((match = actionRegex.exec(response)) !== null) {
              hadActions = true;
              try {
                const action = JSON.parse(match[1]);
                currentTurnLogs.push({
                  id: uuidv4(),
                  timestamp: Date.now(),
                  type: 'action',
                  content: `Executing ${action.type}`,
                  data: action
                });
                
                let result = "Action completed successfully.";
                
                if (action.type === 'ADD_NODE') {
                  const newNode = get().addNode(action.nodeType || 'fulltext', action.data);
                  result = `Node added with ID: ${newNode.id}`;
                } else if (action.type === 'DELETE_NODE') {
                  get().deleteNode(action.id);
                  result = `Node ${action.id} deleted.`;
                } else if (action.type === 'UPDATE_NODE') {
                  const node = get().doc.nodes.find(n => n.id === action.id);
                  if (node) {
                    get().saveNode({ ...node, ...action.data });
                    result = `Node ${action.id} updated.`;
                  } else {
                    result = `Error: Node ${action.id} not found.`;
                  }
                } else if (action.type === 'UPDATE_METADATA') {
                  get().updateMetadata(action.data);
                  result = `Metadata updated.`;
                } else if (action.type === 'SEARCH_GRAPHS') {
                  set({ searchQuery: action.query, selectedMetaArea: action.metaArea || 'All', viewMode: 'graphs' });
                  get().fetchGraphs();
                  result = `Searching for "${action.query}" in ${action.metaArea || 'All'}.`;
                } else if (action.type === 'LOAD_GRAPH') {
                  get().loadGraph(action.id);
                  result = `Graph ${action.id} loaded.`;
                } else if (action.type === 'CREATE_GRAPH') {
                  set({ newGraphTitle: action.title || 'New Graph', newGraphMetaArea: action.metaArea || 'General' });
                  get().createNewGraph();
                  result = `New graph "${action.title}" created.`;
                } else if (action.type === 'LIST_META_AREAS') {
                  set({ viewMode: 'graphs' });
                  get().fetchGraphs();
                  result = `Categories listed.`;
                } else if (action.type === 'WORKER_AI') {
                  const { endpoint, data } = action;
                  const aiResult = await workerAIService.generateContent(endpoint, data);
                  
                  // Generic handler for any endpoint that returns content or url
                  if (aiResult && (aiResult.content || aiResult.url) && data.nodeId) {
                    const node = get().doc.nodes.find(n => n.id === data.nodeId);
                    if (node) {
                      const newInfo = aiResult.content || (aiResult.url ? `![Generated Asset](${aiResult.url})` : '');
                      get().saveNode({ ...node, info: newInfo });
                      result = `Worker AI content generated for node ${data.nodeId} via ${endpoint}.`;
                    }
                  } else if (endpoint === '/classifyGraph') {
                    if (aiResult && aiResult.classification) {
                      get().updateMetadata({ metaArea: aiResult.classification });
                      result = `Graph classified as ${aiResult.classification}.`;
                    }
                  } else if (endpoint === '/patchGraphMetadata') {
                    get().updateMetadata(data.metadata);
                    result = `Metadata patched.`;
                  } else {
                    result = `Worker AI action on ${endpoint} completed. Result: ${JSON.stringify(aiResult).substring(0, 100)}...`;
                  }
                }

                currentTurnLogs.push({
                  id: uuidv4(),
                  timestamp: Date.now(),
                  type: 'result',
                  content: result
                });
                actionResults.push(result);

              } catch (e: any) {
                const errorMsg = `Action Error: ${e.message}`;
                currentTurnLogs.push({
                  id: uuidv4(),
                  timestamp: Date.now(),
                  type: 'error',
                  content: errorMsg
                });
                actionResults.push(errorMsg);
              }
            }

            if (!hadActions) break;

            // 4. Feed back to agent
            const feedbackMessage: AgentMessage = {
              id: uuidv4(),
              agentId: agent.id,
              role: 'user',
              content: `ACTION RESULTS:\n${actionResults.join('\n')}\n\nPlease provide a final summary or next step.`,
              timestamp: Date.now()
            };
            currentMessages = [...currentMessages, feedbackMessage];
          }

          const modelMessage: AgentMessage = {
            id: uuidv4(),
            agentId: agent.id,
            role: 'assistant',
            content: finalResponse,
            timestamp: Date.now(),
            logs: currentTurnLogs
          };

          set((state) => ({
            agentMessages: [...state.agentMessages, modelMessage],
          }));
        } catch (error: any) {
          console.error('Agent Chat Error:', error);
          set({ error: error.message || 'Failed to get response from agent' });
        } finally {
          set({ isLoading: false });
        }
      },

      clearAgentChat: () => {
        const { activeAgentId } = get();
        if (!activeAgentId) return;
        set((state) => ({
          agentMessages: state.agentMessages.filter((m) => m.agentId !== activeAgentId),
        }));
      },

      generateAvatar: async (name, description) => {
        return await generateAgentAvatar(name, description);
      },

      addNode: (type, initialData) => {
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
          path: null,
          ...initialData
        };
        set((state) => ({
          doc: { ...state.doc, nodes: [...state.doc.nodes, newNode] },
          editingNodeId: newNode.id
        }));
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
        return newNode;
      },

      saveNode: (updatedNode) => {
        set((state) => ({
          doc: {
            ...state.doc,
            nodes: state.doc.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
          },
          editingNodeId: null
        }));
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
      },

      deleteNode: (id) => {
        set((state) => ({
          doc: {
            ...state.doc,
            nodes: state.doc.nodes.filter(n => n.id !== id)
          },
          editingNodeId: null
        }));
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
      },

      toggleNodeVisibility: (id) => {
        set((state) => ({
          doc: {
            ...state.doc,
            nodes: state.doc.nodes.map(n => n.id === id ? { ...n, visible: !n.visible } : n)
          }
        }));
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
      },

      moveNode: (index, direction) => {
        set((state) => {
          const newNodes = [...state.doc.nodes];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= newNodes.length) return state;
          [newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
          return { doc: { ...state.doc, nodes: newNodes } };
        });
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
      },

      setNodes: (nodes) => {
        set((state) => ({ doc: { ...state.doc, nodes } }));
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
      },

      updateMetadata: (data) => {
        set((state) => ({
          doc: {
            ...state.doc,
            metadata: { ...state.doc.metadata, ...data }
          }
        }));
        
        // Auto-save
        if (get().currentGraphId) {
          get().saveGraph();
        }
      },
    }),
    {
      name: 'knowledge-graph-storage',
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        selectedMetaArea: state.selectedMetaArea,
        selectedNodeType: state.selectedNodeType,
        searchQuery: state.searchQuery,
        aiProvider: state.aiProvider,
        aiModel: state.aiModel,
        agents: state.agents,
        agentMessages: state.agentMessages
      }),
    }
  )
);
