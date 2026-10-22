
import { KnowledgeDocument, Node, GraphListItem } from '../types';
import { worldDomain } from '../branding';
import { sortNodesByOrder } from '../utils/nodeOrder';

const API_BASE_URL = 'https://knowledge.vegvisr.org';
const nodeTypesPromises = new Map<string, Promise<string[]>>(); // world ('' = platform) -> types
// The World each read graph lives in (getknowgraph's X-Graph-World header), so its own node
// types render and can be picked (rendering engine phase 2, 2026-10-18).
const graphWorlds = new Map<string, string | null>();
// Every call carries the SIGNED-IN USER's own token — the one the magic-link login stored.
// Until 2026-10-15 a single hard-coded token, readable in the public bundle, was sent for every
// user: the knowledge-graph worker then saw "the editor", never the person, so it could not keep
// a World Founder's own graphs (stored in their World) to that founder, and anyone holding the
// bundle held a working write token. No token (signed out) sends none; the app asks for login.
const getApiToken = () => {
  try {
    return localStorage.getItem('emailVerificationToken') || '';
  } catch {
    return '';
  }
};

// Canonical contact-form template row in graphTemplates (vegvisr_org D1).
// Single source of truth for the "Kontaktskjema" html-node — do not inline the
// snippet in React; fetch it here so the template stays the one place it lives.
export const CONTACT_FORM_TEMPLATE_ID = '367f10cd-30f0-491f-9796-e8866782b2a9';

export interface MetaAreaItem {
  name: string;
  count: number;
}

export interface SaveResponse {
  message: string;
  id: string;
  newVersion: number;
}

export const knowledgeService = {
  // Fetch a graphTemplates row by id and return its parsed nodes.
  // `nodes` comes back as a JSON string from getTemplates.
  async getTemplateNodes(templateId: string): Promise<Node[]> {
    const response = await fetch(`${API_BASE_URL}/getTemplates`, {
      headers: {
        'X-API-Token': getApiToken()
      }
    });
    if (!response.ok) throw new Error('Failed to fetch templates');
    const data = await response.json();
    const results: any[] = Array.isArray(data.results) ? data.results : [];
    const tpl = results.find((t) => t.id === templateId);
    if (!tpl) throw new Error(`Template ${templateId} not found`);
    const nodes = typeof tpl.nodes === 'string' ? JSON.parse(tpl.nodes) : tpl.nodes;
    return (nodes || []) as Node[];
  },

  async listGraphs(metaArea?: string): Promise<GraphListItem[]> {
    let url = `${API_BASE_URL}/getknowgraphs`;
    
    // If a specific area is selected, use the summaries endpoint which supports filtering
    if (metaArea && metaArea !== 'All') {
      url = `https://knowledge.vegvisr.org/getknowgraphsummaries?metaArea=${encodeURIComponent(metaArea)}&limit=250`;
    }

    const response = await fetch(url, {
      headers: {
        'X-API-Token': getApiToken()
      }
    });
    if (!response.ok) throw new Error('Failed to list graphs');
    const data = await response.json();
    return data.results || [];
  },

  async searchGraphs(query: string, nodeType?: string): Promise<GraphListItem[]> {
    let url = `${API_BASE_URL}/searchGraphs?limit=50`;
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }
    if (nodeType && nodeType !== 'All') {
      url += `&nodeType=${encodeURIComponent(nodeType)}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-API-Token': getApiToken()
      }
    });
    if (!response.ok) throw new Error('Failed to search graphs');
    const data = await response.json();
    return data.results || [];
  },

  async listMetaAreas(): Promise<MetaAreaItem[]> {
    const response = await fetch('https://knowledge.vegvisr.org/getmetaareas', {
      headers: {
        'X-API-Token': getApiToken()
      }
    });
    if (!response.ok) throw new Error('Failed to fetch meta areas');
    const data = await response.json();
    
    // Handle different possible response structures
    let rawAreas: any[] = [];
    if (Array.isArray(data)) rawAreas = data;
    else if (data.results && Array.isArray(data.results)) rawAreas = data.results;
    else if (data.areas && Array.isArray(data.areas)) rawAreas = data.areas;
    else if (data.data && Array.isArray(data.data)) rawAreas = data.data;
    else if (data.metaAreas && Array.isArray(data.metaAreas)) rawAreas = data.metaAreas;
    else {
      console.warn('Unexpected meta areas response format:', data);
      return [];
    }

    // Ensure we return an array of MetaAreaItem objects
    return rawAreas.map(item => {
      if (typeof item === 'string') return { name: item, count: 0 };
      if (item && typeof item === 'object') {
        return {
          name: item.name || item.label || item.title || String(item),
          count: typeof item.count === 'number' ? item.count : 0
        };
      }
      return { name: String(item), count: 0 };
    }).filter(item => item.name);
  },

  async getGraph(id: string): Promise<KnowledgeDocument> {
    try {
      const response = await fetch(`${API_BASE_URL}/getknowgraph?id=${id}`, {
        headers: {
          'X-API-Token': getApiToken()
        }
      });
      graphWorlds.set(id, response.headers.get('X-Graph-World'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Graph Error:', response.status, errorText);
        // If 500 with "map" or "undefined" error, it's likely a corrupted graph (missing nodes/edges)
        if (response.status === 500 && (errorText.includes('map') || errorText.includes('undefined') || errorText.includes('properties of'))) {
          throw new Error('GRAPH_CORRUPTED');
        }
        throw new Error(`Failed to fetch graph (${response.status}): ${errorText || response.statusText}`);
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.warn('Failed to parse graph JSON, likely corrupted:', parseError);
        throw new Error('GRAPH_CORRUPTED');
      }
      
      // Ensure nodes and edges are arrays to prevent client-side crashes
      // and handle potentially malformed data from the server
      if (data) {
        if (!Array.isArray(data.nodes)) data.nodes = [];
        if (!Array.isArray(data.edges)) data.edges = [];
        if (!data.metadata) data.metadata = { title: 'Untitled Graph', description: '' };
        // Show the nodes in the same reading order as every other viewer (node.order).
        data.nodes = sortNodesByOrder(data.nodes);
      }
      
      return data;
    } catch (e: any) {
      if (e.message === 'GRAPH_CORRUPTED') {
        // Don't log as error, it's a known state handled by the store
        console.warn('Graph is corrupted (detected in getGraph)');
      } else {
        console.error('Get Graph Exception:', e);
      }
      throw e;
    }
  },

  /**
   * A World's own node types with their shown title and fields — so a node of such a type is
   * edited as a form (Nodetyper, 2026-10-18). {} for the platform or when it cannot be read.
   */
  async getWorldTypeInfo(world: string | null): Promise<Record<string, { title: string; fields: { key: string; label: string; kind: string }[] }>> {
    if (!world) return {};
    try {
      const r = await fetch(`${API_BASE_URL}/node-types?world=${encodeURIComponent(world)}`);
      const data = r.ok ? await r.json() : null;
      return (data && typeof data.worldTypeInfo === 'object' && data.worldTypeInfo) || {};
    } catch {
      return {};
    }
  },

  /** The World a graph read by getGraph lives in, or null (the platform). */
  graphWorld(id: string): string | null {
    return graphWorlds.get(id) || null;
  },

  // Node types the platform knows (registry-driven): { renderable, registered, all }. With a
  // World, that World's own types are added (they are valid only in its graphs).
  // Cached for the page's lifetime; a failure yields [] so the editor falls back.
  async getNodeTypes(world: string | null = null): Promise<string[]> {
    const key = world || '';
    if (!nodeTypesPromises.has(key)) {
      const q = key ? `?world=${encodeURIComponent(key)}` : '';
      nodeTypesPromises.set(key, fetch(`${API_BASE_URL}/node-types${q}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => (Array.isArray(data?.all) ? data.all.filter((t: unknown) => typeof t === 'string') : []))
        .catch(() => { nodeTypesPromises.delete(key); return []; }));
    }
    return nodeTypesPromises.get(key)!;
  },

  async saveGraph(id: string, doc: KnowledgeDocument, override: boolean = false): Promise<SaveResponse> {
    const nodes = doc.nodes || [];
    const title = doc.metadata?.title || nodes.find(n => n.type === 'title')?.label || 'Untitled Graph';
    const description = doc.metadata?.description || nodes.find(n => n.type === 'notes')?.label || '';

    const payload = {
      id,
      graphData: {
        // The server replaces metadata wholesale, so everything the graph already
        // carries (seo*, publicationState, semantic*, userId …) has to ride along
        // or this save erases it.
        metadata: {
          ...doc.metadata,
          title,
          description,
          createdBy: doc.metadata?.createdBy || 'Knowledge Editor',
          version: doc.metadata?.version || 0,
          metaArea: doc.metadata?.metaArea || ''
        },
        // Same rule per node: spread the loaded node so every field this editor
        // does not own (metadata, commentaries, position, publishGate …) survives,
        // then normalise only the fields the editor edits.
        nodes: nodes.map(node => {
          const w = parseInt(node.imageWidth as any);
          const h = parseInt(node.imageHeight as any);
          return {
            ...node,
            info: node.info || '',
            bibl: node.bibl || [],
            imageWidth: isNaN(w) ? null : w,
            imageHeight: isNaN(h) ? null : h,
            // The app is linear, but the API expects a position; keep a real one.
            position: node.position || { x: 0, y: 0 }
          };
        }),
        edges: doc.edges || []
      },
      override,
      // On a World's own host, a NEW graph is stored in that World; an existing one stays put.
      ...(worldDomain() ? { world: worldDomain() } : {})
    };

    const response = await fetch(`${API_BASE_URL}/saveGraphWithHistory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': getApiToken()
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 409) {
      throw new Error('VERSION_MISMATCH');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save graph: ${errorText}`);
    }

    return await response.json();
  },

  async deleteGraph(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/deleteknowgraph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': getApiToken()
      },
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Failed to delete graph');
    const data = await response.json();
    return data.success || true;
  },

  async getTrash(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/getTrash`, {
      headers: {
        'X-API-Token': getApiToken()
      }
    });
    if (!response.ok) throw new Error('Failed to fetch trash');
    const data = await response.json();
    return data.results || [];
  },

  async getGraphHistory(id: string): Promise<{ version: number; timestamp: string }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/getknowgraphhistory?id=${id}`, {
        headers: {
          'X-API-Token': getApiToken()
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch History Error:', response.status, errorText);
        throw new Error(`Failed to fetch graph history (${response.status}): ${errorText}`);
      }
      const data = await response.json();
      console.log('Graph History Data:', data);
      
      // Handle the nested structure: { graphId: "...", history: { results: [...] } }
      if (data && data.history && Array.isArray(data.history.results)) {
        return data.history.results.map((item: any) => ({
          ...item,
          timestamp: item.timestamp || item.updatedAt || item.created_date || new Date().toISOString()
        }));
      }
      
      // Fallback for other potential formats
      let results = [];
      if (Array.isArray(data)) results = data;
      else if (data && Array.isArray(data.results)) results = data.results;
      
      return results.map((item: any) => ({
        ...item,
        timestamp: item.timestamp || item.updatedAt || item.created_date || new Date().toISOString()
      }));
    } catch (e) {
      console.error('Get Graph History Exception:', e);
      throw e;
    }
  },

  async getGraphVersion(id: string, version: number): Promise<KnowledgeDocument> {
    try {
      const response = await fetch(`${API_BASE_URL}/getknowgraphversion?id=${id}&version=${version}`, {
        headers: {
          'X-API-Token': getApiToken()
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 500 && (errorText.includes('map') || errorText.includes('undefined') || errorText.includes('properties of'))) {
          throw new Error('VERSION_CORRUPTED');
        }
        throw new Error(`Failed to fetch graph version ${version}: ${errorText}`);
      }
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data) {
          if (!Array.isArray(data.nodes)) data.nodes = [];
          if (!Array.isArray(data.edges)) data.edges = [];
          if (!data.metadata) data.metadata = { title: 'Untitled Graph', description: '' };
          data.nodes = sortNodesByOrder(data.nodes);
        }
        return data;
      } catch (parseError) {
        console.warn(`Failed to parse graph version ${version} JSON:`, parseError);
        throw new Error('VERSION_CORRUPTED');
      }
    } catch (e: any) {
      if (e.message !== 'VERSION_CORRUPTED') {
        console.error(`Get Graph Version ${version} Exception:`, e);
      }
      throw e;
    }
  },

  async restoreGraph(trashId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/restoreGraph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': getApiToken()
      },
      body: JSON.stringify({ trashId })
    });
    if (!response.ok) throw new Error('Failed to restore graph');
    const data = await response.json();
    return data.success || true;
  },

  async generateSEOPage(payload: any): Promise<{ success: boolean; url: string }> {
    const response = await fetch('https://seo.vegvisr.org/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': getApiToken()
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ? `SEO page not generated: ${body.error}` : `Failed to generate SEO page (${response.status})`);
    }
    return await response.json();
  },

  async fetchOpenApiSpec(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/openapi.json`);
      if (response.ok) return await response.json();
    } catch (e) {
      console.warn('Failed to fetch openapi.json, trying openaiapi.json');
    }

    const response = await fetch(`${API_BASE_URL}/openaiapi.json`);
    if (!response.ok) throw new Error('Failed to fetch OpenAPI spec from both common locations');
    return await response.json();
  }
};
