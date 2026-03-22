
import { KnowledgeDocument, Node, GraphListItem } from '../types';

const API_BASE_URL = 'https://knowledge.vegvisr.org';
const API_TOKEN = 'gemini-3153b1233a9fa463f9749003fc97f5890c0d80cc0759cf5abed8c8024c5b94ac';

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
    const response = await fetch(`${API_BASE_URL}/getknowgraph?id=${id}`, {
      headers: {
        'X-API-Token': API_TOKEN
      }
    });
    if (!response.ok) throw new Error('Failed to fetch graph');
    return await response.json();
  },

  async saveGraph(id: string, doc: KnowledgeDocument, override: boolean = false): Promise<SaveResponse> {
    const title = doc.metadata?.title || doc.nodes.find(n => n.type === 'title')?.label || 'Untitled Graph';
    const description = doc.metadata?.description || doc.nodes.find(n => n.type === 'notes')?.label || '';

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
        nodes: doc.nodes.map(node => ({
          id: node.id,
          label: node.label,
          color: node.color,
          type: node.type,
          info: node.info || '',
          bibl: node.bibl || [],
          visible: node.visible,
          imageWidth: parseInt(node.imageWidth) || null,
          imageHeight: parseInt(node.imageHeight) || null,
          path: node.path,
          position: { x: 0, y: 0 } // Default position as app is linear but API expects it
        })),
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
  }
};
