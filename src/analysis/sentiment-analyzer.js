import { logger } from '../utils/logger.js';

export class SentimentAnalyzer {
  constructor(lexicon) {
    this.lexicon = lexicon;
  }

  analyze(text) {
    if (!text) return 0;

    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    let matchedWords = 0;

    words.forEach(word => {
      if (this.lexicon.positive.includes(word)) {
        score += this.lexicon.weights.positive;
        matchedWords++;
      } else if (this.lexicon.negative.includes(word)) {
        score += this.lexicon.weights.negative;
        matchedWords++;
      }
    });

    // Check for emojis separately as they might not be space-separated
    this.lexicon.positive.forEach(emoji => {
      if (text.includes(emoji)) {
        score += this.lexicon.weights.positive;
        matchedWords++;
      }
    });

    this.lexicon.negative.forEach(emoji => {
      if (text.includes(emoji)) {
        score += this.lexicon.weights.negative;
        matchedWords++;
      }
    });

    if (matchedWords === 0) return 0;
    
    // Normalize score to -1 to 1
    return Math.max(-1, Math.min(1, score / Math.sqrt(matchedWords + 1)));
  }
}
