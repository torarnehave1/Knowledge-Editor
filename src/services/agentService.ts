
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentMessage, KnowledgeDocument } from "../types";
import { askGemini } from "./geminiService";

// Initialize the SDK with the API key from environment
// Moved inside functions to ensure up-to-date API key as per guidelines

/**
 * Formats a knowledge graph into a text context for the agent.
 */
function formatGraphContext(doc: KnowledgeDocument): string {
  if (!doc || !doc.nodes) return "No graph data available.";
  
  // Only include essential info to save tokens
  const nodes = doc.nodes.map(n => `- ID: ${n.id}, Label: ${n.label}, Type: ${n.type}`).join('\n');
  const edges = (doc.edges || []).map(e => `- ${e.source} -> ${e.target} (${e.label || 'related'})`).join('\n');
  
  return `
GRAPH CONTEXT:
Title: ${doc.metadata?.title || 'Untitled'}
Nodes:
${nodes}
Edges:
${edges}
  `.trim();
}

/**
 * Sends a message to an agent and gets a response.
 */
export async function chatWithAgent(
  agent: Agent, 
  messages: AgentMessage[], 
  graphData?: KnowledgeDocument
): Promise<string> {
  const graphContext = graphData ? formatGraphContext(graphData) : "No graph context provided.";

  const agentSettingsContext = `
AGENT SETTINGS:
- Model: ${agent.model || 'gemini-3-flash-preview'}
- Max Turns: ${agent.maxTurns || 20}
- Temperature: ${agent.temperature || 0.7}
- Modalities: ${agent.modalities?.join(', ') || 'text'}
`;

  const toolMappingsContext = agent.toolMappings && agent.toolMappings.length > 0
    ? `
CUSTOM TOOL MAPPINGS:
${agent.toolMappings.map(tm => `- Purpose: ${tm.purpose}\n  Endpoint: ${tm.endpoint}\n  Method: ${tm.method}\n  Description: ${tm.description}`).join('\n')}

To use a custom tool, use the WORKER_AI action with the specified endpoint.
`
    : "";

  const systemInstruction = `
${agent.systemInstruction}

${agentSettingsContext}
${toolMappingsContext}

You are a Knowledge Graph Action Agent. 
Your purpose is to execute actions on the graph based on user requests.

GUIDELINES:
1. If actions are needed, state what you are doing and provide the [ACTION: ...] block.
2. If you receive "ACTION RESULTS", review them. DO NOT repeat an action that was already successful.
3. Once all requested actions are completed and successful, provide a concise summary of what was done and STOP.
4. DO NOT use conversational filler like "Hello" or "How can I help".
5. Be extremely concise and technical.
6. For YouTube videos, use 'youtube-video' nodeType and set the URL in the 'path' field.
7. Do NOT include YouTube tags like ![YOUTUBE...] in the node 'label'. Use a clean title.
8. If using YOUTUBE tags in 'info', use format: ![YOUTUBE src=URL]TITLE[END YOUTUBE]
9. If you encounter a YOUTUBE tag in a label, remove it and move it to the info field if appropriate.

API REFERENCE (https://knowledge.vegvisr.org):
- GET /openapi.json: Full API spec.
- POST /generate-worker-ai: Advanced content generation.
- POST /classifyGraph: Graph analysis.
- PATCH /patchGraphMetadata: Metadata updates.
- POST /chat: General AI chat.
- POST /generate-image: Image generation.
- POST /generate-video: Video generation.
- POST /generate-audio: Audio generation.
- POST /generate-tts: Text-to-speech.

ACTIONS (MANDATORY):
1. Add node: [ACTION: {"type": "ADD_NODE", "nodeType": "fulltext", "data": {"label": "New Label", "info": "Initial content..."}}]
   (nodeTypes: 'fulltext', 'youtube-video', 'image', 'audio', 'video')
2. Delete node: [ACTION: {"type": "DELETE_NODE", "id": "NODE_ID"}]
3. Update node: [ACTION: {"type": "UPDATE_NODE", "id": "NODE_ID", "data": {"label": "New Label", "info": "New content..."}}]
4. Update metadata: [ACTION: {"type": "UPDATE_METADATA", "data": {"title": "New Title", "description": "New description..."}}]
5. Search graphs: [ACTION: {"type": "SEARCH_GRAPHS", "query": "term", "metaArea": "Category"}]
6. Load graph: [ACTION: {"type": "LOAD_GRAPH", "id": "GRAPH_ID"}]
7. Create graph: [ACTION: {"type": "CREATE_GRAPH", "title": "Title", "metaArea": "Area"}]
8. List categories: [ACTION: {"type": "LIST_META_AREAS"}]
9. Worker AI: [ACTION: {"type": "WORKER_AI", "endpoint": "ENDPOINT", "data": {...}}]
   (Example: [ACTION: {"type": "WORKER_AI", "endpoint": "/generate-worker-ai", "data": {"nodeId": "NODE_ID", "prompt": "..."}}])

CRITICAL:
- Use NODE_IDs from the GRAPH CONTEXT below.
- If a change is requested, you MUST use an ACTION block.
- Be extremely concise. NO conversational filler.

${graphContext}
  `.trim();

  const history = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // Limit history based on maxTurns if set
  const maxTurns = agent.maxTurns || 20; // Default to 20 turns
  const limitedHistory = history.slice(-maxTurns);

  // The graph context is already in the system instruction for every turn.
  // We don't need to inject it into the user message as well, which saves tokens.
  const lastUserMessage = [...limitedHistory].reverse().find(m => m.role === 'user');

  let currentHistory = limitedHistory;
  let attempts = 0;
  const maxAttempts = 3;

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: agent.model || "gemini-3-flash-preview",
        contents: currentHistory.map(m => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          parts: [{ text: m.content }] 
        })),
        config: { 
          systemInstruction,
          temperature: agent.temperature || 0.7
        }
      });
      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (sdkError: any) {
      console.error("Direct SDK chat failed:", sdkError);
      // If it's a token limit error, we might still want to retry with less history
      if (sdkError.message?.toLowerCase().includes('token') || sdkError.message?.toLowerCase().includes('limit')) {
        const reducedHistory = currentHistory.slice(Math.floor(currentHistory.length / 2));
        if (reducedHistory.length < currentHistory.length) {
          return chatWithAgent(agent, messages, graphData); // Recursive retry with reduced history
        }
      }
      // Fallback to proxy if SDK fails for other reasons
    }
  }

  try {
    // Use the proxy service as fallback or if no key
    const response = await askGemini(
      "", 
      null, 
      "gemini", 
      agent.model || "gemini-3-flash-preview", 
      systemInstruction, 
      currentHistory,
      agent.temperature
    );
    return response || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error(`Agent proxy chat attempt ${attempts + 1} failed:`, error);
    
    // If it's a token limit error, try again with less history
    if (error.message?.toLowerCase().includes('token') || error.message?.toLowerCase().includes('limit')) {
      const reducedHistory = currentHistory.slice(Math.floor(currentHistory.length / 2));
      if (reducedHistory.length < currentHistory.length) {
        return chatWithAgent(agent, messages, graphData); // Recursive retry with reduced history
      }
    }
    throw error;
  }
}

/**
 * Generates an avatar image for an agent based on its description.
 */
export async function generateAgentAvatar(agentName: string, description: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  
  if (!apiKey) {
    console.warn("API key missing for avatar generation, using fallback.");
    return `https://picsum.photos/seed/${encodeURIComponent(agentName)}/200/200`;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash-image";
  const prompt = `A professional and stylized avatar icon for an AI agent named "${agentName}". The agent's purpose is: ${description}. The style should be clean, modern, and suitable for a profile picture. No text in the image.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ text: prompt }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // Fallback to picsum if image generation fails
    return `https://picsum.photos/seed/${encodeURIComponent(agentName)}/200/200`;
  } catch (error) {
    console.error("Failed to generate avatar:", error);
    return `https://picsum.photos/seed/${encodeURIComponent(agentName)}/200/200`;
  }
}
