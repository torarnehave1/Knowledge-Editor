
import { KnowledgeDocument } from '../types';

const API_BASE_URL = 'https://knowledge.vegvisr.org';
const API_TOKEN = 'gemini-3153b1233a9fa463f9749003fc97f5890c0d80cc0759cf5abed8c8024c5b94ac';

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
          'X-API-Token': API_TOKEN
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
          'X-API-Token': API_TOKEN
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
