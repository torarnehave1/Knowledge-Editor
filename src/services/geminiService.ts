
import { GoogleGenAI } from "@google/genai";

const VEGVISR_API_URL = "https://api.vegvisr.org/worker-ai/chat";

export async function askGemini(
  prompt: string, 
  currentContent?: string | null, 
  provider: string = "gemini", 
  model?: string, 
  customSystem?: string,
  history: { role: string, content: string }[] = [],
  temperature?: number
) {
  const defaultSystem = `
    You are a Knowledge Graph Assistant. Your goal is to help users build and refine their knowledge graphs.
    
    When generating content for a node, use standard Markdown.
    
    CRITICAL: You MUST use these custom tags for special formatting in 'fulltext' nodes:
    1. [SECTION | background-color:#HEX; color:#HEX] ... content ... [END SECTION]
       - Use this for highlighting blocks of text.
       - Example: [SECTION | background-color:#F3F4F6; color:#1F2937] Important summary here. [END SECTION]
    
    2. [QUOTE | Cited='Author Name'] ... quote text ... [END QUOTE]
       - Use this for famous quotes or citations.
       - Example: [QUOTE | Cited='Albert Einstein'] Imagination is more important than knowledge. [END QUOTE]
    
    3. [FANCY | background-image:url('https://picsum.photos/seed/keyword/1920/1080'); color:white] ... content ... [END FANCY]
       - Use this for high-impact hero sections or visual breaks.
       - ALWAYS include a background-image from picsum.photos.
       - ALWAYS use 'color:white' for text on these sections as they have a dark overlay.
       - Example: [FANCY | background-image:url('https://picsum.photos/seed/cosmos/1920/1080'); color:white] # The Infinite Universe [END FANCY]
    
    4. [COMMENTARY] ... text ... [END COMMENTARY]
       - Use for side notes or meta-commentary.
    
    5. [YOUTUBE] VIDEO_ID [END YOUTUBE]
       - Use for embedding videos.
    
    Guidelines:
    - Be concise but informative.
    - Use headings (##, ###) to structure long content.
    - Ensure high contrast for all text.
    - If the user asks to "make it fancy", use the [FANCY] tag.
    - If the user asks for a "quote", use the [QUOTE] tag.
    - If the user asks for a "section", use the [SECTION] tag.
    
    Current content context:
    ${currentContent || 'None'}
    
    Return ONLY the content for the section. Do not include explanations.
  `;

  const systemInstruction = customSystem || defaultSystem;

  try {
    const body: any = {
      provider,
      system: systemInstruction,
      messages: history.length > 0 ? history : [
        { role: "user", content: prompt }
      ]
    };

    if (model && model.trim() !== '') {
      body.model = model;
    }

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    const userToken = localStorage.getItem('emailVerificationToken');

    const response = await fetch(VEGVISR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': userToken || '',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Worker AI API Error:', response.status, errorText);
      throw new Error(`API Error: ${response.status} ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    let content = data.content || 
                  data.message?.content || 
                  data.choices?.[0]?.message?.content || 
                  data.result || 
                  '';
    
    if (Array.isArray(content)) {
      content = content.map((part: any) => part.text || '').join('');
    }
    
    return content;
  } catch (error) {
    console.error('Worker AI Error:', error);
    throw error;
  }
}
