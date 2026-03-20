
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function askGemini(prompt: string, currentContent?: string | null) {
  const systemInstruction = `
    You are an expert full-stack developer and content creator for a "Knowledge Editor" application.
    The application uses a specific JSON format for sections.
    You can generate content in Markdown and HTML.
    
    For HTML sections:
    - Return a complete, valid HTML5 document starting with <!DOCTYPE html>.
    - Use modern CSS (Tailwind via CDN or Bootstrap if requested).
    - Ensure the code is responsive and accessible.
    - If the user asks for a specific library (Three.js, D3.js, etc.), include the necessary CDN scripts.
    - Focus on high-quality, interactive components.
    
    For standard sections, you can use special tags:
    - [FANCY | font-size:18.5em; color:#FFFFFF; background-image:url('...')]...[END FANCY] for hero sections.
    - [SECTION | background-color:'#...'; color:'#...']...[END SECTION] for styled blocks.
    - [QUOTE | Cited='...']...[END QUOTE] for blockquotes.
    
    Current content context:
    ${currentContent || 'None'}
    
    User request:
    ${prompt}
    
    Return ONLY the content for the section. Do not include explanations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return response.text || '';
  } catch (error) {
    console.error('Gemini Error:', error);
    return 'Error generating content. Please try again.';
  }
}
