import { logger } from '../utils/logger.js';

export class TranscriptionService {
    constructor(aiGenerator) {
        this.aiGenerator = aiGenerator;
        this.summaryHistory = [];
        this.isProcessing = false;
    }

    async generateSummary(audioData) {
        if (this.isProcessing || !this.aiGenerator || !this.aiGenerator.apiKey) return null;

        this.isProcessing = true;
        logger.info('TranscriptionService: Generating summary from audio...');

        const prompt = `
You are an expert livestream moderator. 
Analyze the AUDIO provided and identify:
1. What the host is currently talking about (Topic).
2. Key points or important announcements mentioned.
3. Summary of the live vibe.

FORMAT (VIETNAMESE):
- 📌 CHỦ ĐỀ CHÍNH: [Tên chủ đề]
- 📝 ĐIỂM QUAN TRỌNG: [1-2 điểm chính]

Be extremely concise. Max 30 words total.
`;

        try {
            const summary = await this.aiGenerator.generateComment([], null, audioData, prompt);
            if (summary) {
                this.summaryHistory.push({
                    text: summary,
                    timestamp: Date.now()
                });
                if (this.summaryHistory.length > 5) this.summaryHistory.shift();
            }
            this.isProcessing = false;
            return summary;
        } catch (error) {
            logger.error('TranscriptionService: Failed to generate summary:', error);
            this.isProcessing = false;
            return null;
        }
    }
}
