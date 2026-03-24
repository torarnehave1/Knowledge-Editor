
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
  
  const nodes = doc.nodes.map(n => `- ${n.label} (${n.type}): ${n.info?.substring(0, 200) || 'No content'}`).join('\n');
  const edges = (doc.edges || []).map(e => `- ${e.source} -> ${e.target} (${e.label || 'related'})`).join('\n');
  
  return `
Current Knowledge Graph Context:
Title: ${doc.metadata?.title || 'Untitled'}
Description: ${doc.metadata?.description || 'No description'}

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
  
  const systemInstruction = `
${agent.systemInstruction}

CONTEXT:
You are an AI Agent with access to a specific knowledge graph. Use the following graph data as your single source of truth when answering questions. If the information is not in the graph, you can use your general knowledge but prioritize the graph content.

${graphContext}
  `.trim();

  const history = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user', // Map roles for the proxy
    content: m.content
  }));

  try {
    // Use the proxy service instead of direct SDK call to avoid key exposure and ad-blockers
    const response = await askGemini(
      "", 
      null, 
      "gemini", 
      "gemini-3-flash-preview", 
      systemInstruction, 
      history
    );
    return response || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Agent proxy chat failed, attempting direct fallback if key exists:", error);
    
    // Fallback to direct SDK only if a key is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
        config: { systemInstruction }
      });
      return response.text || "I'm sorry, I couldn't generate a response.";
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
