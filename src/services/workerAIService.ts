
import { KnowledgeDocument } from '../types';

const API_BASE_URL = 'https://knowledge.vegvisr.org';
// The signed-in user's own token, as in knowledgeService.ts — never a shared one (2026-10-15).
const apiToken = () => {
  try {
    return localStorage.getItem('emailVerificationToken') || '';
  } catch {
    return '';
  }
};

export interface WorkerAIRequest {
  prompt: string;
  context?: string;
  model?: string;
  graphData?: KnowledgeDocument;
  nodeId?: string;
}

export const workerAIService = {
  async generateContent(endpoint: string, payload: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': apiToken()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Worker AI Error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  async patchMetadata(id: string, metadata: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${API_BASE_URL}/patchGraphMetadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': apiToken()
        },
        body: JSON.stringify({ id, ...metadata }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to patch metadata: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  async classifyGraph(doc: KnowledgeDocument): Promise<any> {
    return this.generateContent('/classifyGraph', { graphData: doc });
  }
};
