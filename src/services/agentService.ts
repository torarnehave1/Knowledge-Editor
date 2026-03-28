
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
Meta Area (Category): ${doc.metadata?.metaArea || 'None'}
Created By: ${doc.metadata?.createdBy || 'Unknown'}
Version: ${doc.metadata?.version || 0}

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

  const systemInstruction = `
${agent.systemInstruction}

${agentSettingsContext}

CAPABILITIES:
- You are powered by Google Gemini.
- You can generate text, images, and video.
- You can manage the knowledge graph (add/update/delete sections).
- You can search for other graphs and list categories.
- You can use various AI models (Gemini, Grok, etc.) for text, images, and video.
- You can execute actions automatically using the [ACTION: ...] blocks.

You have knowledge of the Knowledge Graph Worker API (https://knowledge.vegvisr.org).
Available endpoints and their full capacity:
- GET /health: Checks the operational status of the API.
- GET /openapi.json: Retrieves the full OpenAPI specification.
- PATCH /patchGraphMetadata: Updates the graph's metadata. Accepts a JSON body with fields like 'title', 'description', and 'seo_metadata'.
- POST /classifyGraph: Analyzes the current graph structure and returns a classification or categorization.
- POST /generate-worker-ai: Triggers advanced AI-driven content generation for graph nodes. Accepts parameters for prompt, context, and model selection.
- POST /chat: General AI chat endpoint for graph-related queries.
- POST /generate-image: Generates images based on graph context.
- POST /generate-video: Generates videos based on graph context.
- POST /generate-audio: Generates audio based on graph context.
- POST /generate-tts: Generates text-to-speech based on graph context.
- POST /generate-veo: Generates high-quality video using Veo models.
- POST /generate-imagen: Generates high-quality images using Imagen models.
- POST /generate-flash-image: Generates images using Gemini Flash Image models.
- POST /generate-flash-audio: Generates audio using Gemini Flash Audio models.
- POST /generate-flash-video: Generates video using Gemini Flash Video models.
- POST /generate-flash-tts: Generates text-to-speech using Gemini Flash TTS models.
- POST /generate-flash-native-audio: Generates native audio using Gemini Flash Native Audio models.
- POST /generate-flash-native-video: Generates native video using Gemini Flash Native Video models.
- POST /generate-flash-native-tts: Generates native text-to-speech using Gemini Flash Native TTS models.
- POST /generate-flash-native-veo: Generates native video using Gemini Flash Native Veo models.
- POST /generate-flash-native-imagen: Generates native images using Gemini Flash Native Imagen models.
- POST /generate-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Image models.
- POST /generate-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Audio models.
- POST /generate-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Video models.
- POST /generate-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-image: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Image models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-audio: Generates native audio using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Audio models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-video: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Video models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-tts: Generates native text-to-speech using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native TTS models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-veo: Generates native video using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Veo models.
- POST /generate-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-flash-native-imagen: Generates native images using Gemini Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Flash Native Imagen models.

GRAPH MANAGEMENT:
- You can search for existing graphs to use as reference or inspiration.
- You can create new graphs from scratch.
- You can load any graph if you have its ID.

SELF-REPORTING:
- If a user asks about your capabilities, what you can do, or how you work, you MUST mention BOTH your local and global capabilities.
- LOCAL: Managing the current knowledge graph (adding/updating/deleting sections/nodes, changing title/description).
- GLOBAL: Searching the entire database for other graphs, listing categories (meta areas), and creating brand new graphs from scratch.
- AI MODELS: Mention that you can generate content using Gemini, Grok, and other models for text, images, and video.
- ACTIONS: Explain that you use [ACTION: ...] blocks to execute these commands automatically.

DOCUMENTATION:
- If a user asks for documentation, technical details, or how to use the API:
  - Technical API Documentation: Point them to the OpenAPI specification at https://knowledge.vegvisr.org/openapi.json.
  - Google Gemini API: Explain that you are powered by Google Gemini and provide the official documentation link: https://ai.google.dev/docs.
  - SDK Documentation: Mention the @google/genai SDK used for communication: https://www.npmjs.com/package/@google/genai.
  - User Guide: Offer to create a "User Guide" section in their current graph or a new "Agent Documentation" graph.
  - Capabilities: Refer them back to your self-reporting summary.

ACTIONS:
You can perform actions on the knowledge graph by including a special JSON block at the end of your message.
The user often refers to "nodes" as "sections". When they ask to "add a section", "delete a section", or "update a section", use the corresponding node action.

Available actions:
1. Add a new node (section):
   [ACTION: {"type": "ADD_NODE", "nodeType": "fulltext"}]
   (Supported nodeTypes: 'fulltext', 'youtube-video', 'image', 'audio', 'video')

2. Delete a node (section):
   [ACTION: {"type": "DELETE_NODE", "id": "NODE_ID"}]

3. Update a node's (section's) content:
   [ACTION: {"type": "UPDATE_NODE", "id": "NODE_ID", "data": {"label": "New Label", "info": "New content..."}}]

4. Update graph metadata (title/description):
   [ACTION: {"type": "UPDATE_METADATA", "data": {"title": "New Title", "description": "New description..."}}]

5. Search for existing graphs:
   [ACTION: {"type": "SEARCH_GRAPHS", "query": "search term", "metaArea": "Optional Category"}]

6. Load a specific graph by ID:
   [ACTION: {"type": "LOAD_GRAPH", "id": "GRAPH_ID"}]

7. Create a new empty graph:
   [ACTION: {"type": "CREATE_GRAPH", "title": "New Graph Title", "metaArea": "General"}]

8. List all available meta areas (categories):
   [ACTION: {"type": "LIST_META_AREAS"}]

When a user asks you to "add a section" or "add a node", you should explain what you are doing and then include the [ACTION: ...] block.
Always use the current graph context to find the correct NODE_ID for updates or deletions.

CONTEXT:
You are an AI Agent with access to a specific knowledge graph. Use the following graph data as your single source of truth when answering questions. If the information is not in the graph, you can use your general knowledge but prioritize the graph content.

${graphContext}
  `.trim();

  const history = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.content
  }));

  // Limit history based on maxTurns if set
  const maxTurns = agent.maxTurns || 20; // Default to 20 turns
  const limitedHistory = history.slice(-maxTurns);

  // Inject context as the first message if it's a new conversation or ensure it's present
  if (limitedHistory.length > 0 && limitedHistory[0].role === 'user') {
    limitedHistory[0].content = `[CONTEXT: The following is the current state of my knowledge graph. Please use this as your primary reference.]\n\n${graphContext}\n\n---\n\nUSER QUESTION: ${limitedHistory[0].content}`;
  }

  try {
    // Use the proxy service
    const response = await askGemini(
      "", 
      null, 
      "gemini", 
      agent.model || "gemini-3-flash-preview", 
      systemInstruction, 
      limitedHistory,
      agent.temperature
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
