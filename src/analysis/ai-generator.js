import { logger } from '../utils/logger.js';

export class AIGenerator {
  constructor() {
    this.apiKey = '';
    this.persona = 'A friendly and supportive viewer who loves the stream.';
    this.topics = '';
    this.style = 'Friendly';
    this.productContext = ''; // New: Custom product list/link
    this.contextBuffer = [];
    this.generatedHistory = []; // New: Memory of own outputs
    this.maxContext = 10;
    this.maxHistory = 20; // Remember last 20 generated comments
    this.lastLatency = 0;
  }

  setSettings(settings) {
    if (settings.apiKey) this.apiKey = settings.apiKey;
    if (settings.persona) this.persona = settings.persona;
    if (settings.topics) this.topics = settings.topics;
    if (settings.style) this.style = settings.style;
    if (settings.productContext !== undefined) this.productContext = settings.productContext;
    logger.info('AI Generator settings updated');
  }

  addContext(comment) {
    this.contextBuffer.push(comment);
    if (this.contextBuffer.length > this.maxContext) {
      this.contextBuffer.shift();
    }
  }

  async generateComment(chatContext = [], imageData = null, audioData = null, customPrompt = null) {
    if (!this.apiKey || this.apiKey.trim() === '') {
      logger.warn('AI Generator: No API Key provided');
      return '';
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const defaultPrompt = `
You are a virtual persona interacting in a TikTok Live stream.
PERSONA: ${this.persona}
TOPICS: ${this.topics}
STYLE: ${this.style}

PRODUCT CONTEXT (Important):
${this.productContext ? this.productContext : 'None provided.'}

CONTEXT:
Chat History (Last 10): ${chatContext.join(' | ')}

PREVIOUSLY SAID (DO NOT REPEAT):
${this.generatedHistory.join(' | ')}

INSTRUCTIONS:
- LINGUISTIC MIRRORING: Detect the language and vibe of the host/chat and respond accordingly.
- If AUDIO is provided, treat it as the host's current words/tone. Mirror their energy (hype/calm) and use similar slang or regional nuances.
- If an IMAGE is provided, look for what the host is doing or their surroundings. Mention it naturally.
- **PRODUCT AWARENESS**: If a Product Context is provided, occasionally mention a product, ask a question about it, or express interest in the shop link.
- **MEMORY**: Do NOT repeat any phrases from the "PREVIOUSLY SAID" list. Vary your sentence structure.
- IMPORTANT: Response in VIETNAMESE by default unless the host/chat is strictly using another language.
- Stay in character. Be concise (max 15 words).
- Only return the comment text, no quotes or metadata.
`;

    const finalPrompt = customPrompt || defaultPrompt;

    const contents = [{
      parts: [
        { text: finalPrompt }
      ]
    }];

    if (imageData) {
      contents[0].parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageData // Should be base64 without prefix
        }
      });
    }

    if (audioData) {
      contents[0].parts.push({
        inline_data: {
          mime_type: "audio/wav", // or whatever we record
          data: audioData
        }
      });
    }

    try {
      logger.info(`AI Generator: Sending multimodal request to Gemini v1beta (${model})...`);
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents })
      });

      this.lastLatency = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (generatedText) {
        // Add to history
        this.generatedHistory.push(generatedText);
        if (this.generatedHistory.length > this.maxHistory) {
          this.generatedHistory.shift();
        }
      }

      return generatedText || null;
    } catch (error) {
      logger.error('AI Generator: Failed to generate comment:', error);
      return null;
    }
  }
}
