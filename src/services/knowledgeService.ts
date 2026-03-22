
import { KnowledgeDocument, Node, GraphListItem } from '../types';

const API_BASE_URL = 'https://knowledge.vegvisr.org';
const API_TOKEN_RAW = import.meta.env.VITE_KNOWLEDGE_API_TOKEN;
const API_TOKEN = (API_TOKEN_RAW && API_TOKEN_RAW !== "undefined") 
  ? API_TOKEN_RAW 
  : 'gemini-3153b1233a9fa463f9749003fc97f5890c0d80cc0759cf5abed8c8024c5b94ac';

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
  async listGraphs(metaArea?: string): Promise<GraphListItem[]> {
    let url = `${API_BASE_URL}/getknowgraphs`;
    
    // If a specific area is selected, use the summaries endpoint which supports filtering
    if (metaArea && metaArea !== 'All') {
      url = `https://knowledge.vegvisr.org/getknowgraphsummaries?metaArea=${encodeURIComponent(metaArea)}&limit=250`;
    }

    const response = await fetch(url, {
      headers: {
        'X-API-Token': API_TOKEN
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
        'X-API-Token': API_TOKEN
      }
    });
    if (!response.ok) throw new Error('Failed to search graphs');
    const data = await response.json();
    return data.results || [];
  },

  async listMetaAreas(): Promise<MetaAreaItem[]> {
    const response = await fetch('https://knowledge.vegvisr.org/getmetaareas', {
      headers: {
        'X-API-Token': API_TOKEN
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
          'X-API-Token': API_TOKEN
        }
      });
      
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

  async saveGraph(id: string, doc: KnowledgeDocument, override: boolean = false): Promise<SaveResponse> {
    const nodes = doc.nodes || [];
    const title = doc.metadata?.title || nodes.find(n => n.type === 'title')?.label || 'Untitled Graph';
    const description = doc.metadata?.description || nodes.find(n => n.type === 'notes')?.label || '';

    const payload = {
      id,
      graphData: {
        metadata: {
          title,
          description,
          createdBy: doc.metadata?.createdBy || 'Knowledge Editor',
          version: doc.metadata?.version || 0,
          metaArea: doc.metadata?.metaArea || ''
        },
        nodes: nodes.map(node => {
          const w = parseInt(node.imageWidth as any);
          const h = parseInt(node.imageHeight as any);
          return {
            id: node.id,
            label: node.label,
            color: node.color,
            type: node.type,
            info: node.info || '',
            bibl: node.bibl || [],
            visible: node.visible,
            imageWidth: isNaN(w) ? null : w,
            imageHeight: isNaN(h) ? null : h,
            path: node.path,
            position: { x: 0, y: 0 } // Default position as app is linear but API expects it
          };
        }),
        edges: doc.edges || []
      },
      override
    };

    const response = await fetch(`${API_BASE_URL}/saveGraphWithHistory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': API_TOKEN
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
        'X-API-Token': API_TOKEN
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
        'X-API-Token': API_TOKEN
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
          'X-API-Token': API_TOKEN
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
          'X-API-Token': API_TOKEN
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
        'X-API-Token': API_TOKEN
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to generate SEO page');
    return await response.json();
  }
};
