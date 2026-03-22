
import { GoogleGenAI } from "@google/genai";
import { Agent, AgentMessage, KnowledgeDocument } from "../types";

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
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const graphContext = graphData ? formatGraphContext(graphData) : "No graph context provided.";
  
  const systemInstruction = `
${agent.systemInstruction}

CONTEXT:
You are an AI Agent with access to a specific knowledge graph. Use the following graph data as your single source of truth when answering questions. If the information is not in the graph, you can use your general knowledge but prioritize the graph content.

${graphContext}
  `.trim();

  const history = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  const response = await ai.models.generateContent({
    model,
    contents: history,
    config: {
      systemInstruction,
    }
  });

  return response.text || "I'm sorry, I couldn't generate a response.";
}

/**
 * Generates an avatar image for an agent based on its description.
 */
export async function generateAgentAvatar(agentName: string, description: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
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
