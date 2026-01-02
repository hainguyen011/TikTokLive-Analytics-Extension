import { logger } from '../utils/logger.js';
import { EVENT_TYPES } from '../utils/constants.js';

export class DataExtractor {
  constructor(selectors) {
    this.selectors = selectors;
  }

  extractComment(element) {
    try {
      if (!this.selectors?.comment) return null;
      const username = element.querySelector(this.selectors.comment.username)?.textContent?.trim();
      const text = element.querySelector(this.selectors.comment.text)?.textContent?.trim();
      
      // TikTok often has the timestamp in a different place now or it's dynamic
      const timestamp = element.querySelector(this.selectors.comment.timestamp)?.textContent?.trim() || new Date().toLocaleTimeString();

      if (!username || !text) return null;

      return {
        type: EVENT_TYPES.COMMENT,
        timestamp: Date.now(),
        data: {
          id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          username,
          text,
          rawTimestamp: timestamp
        }
      };
    } catch (error) {
      logger.error('Error extracting comment:', error);
      return null;
    }
  }

  extractMetrics() {
    try {
      if (!this.selectors?.metrics) return null;
      
      // Viewer count is often text like "Viewers · 1.2K" inside the chat container
      const chatContainer = document.querySelector(this.selectors.metrics.viewers);
      let viewersStr = '';
      if (chatContainer) {
        const text = chatContainer.textContent;
        const match = text.match(/Viewers\s*·\s*([\d.KMB]+)/i);
        if (match) viewersStr = match[1];
      }

      // Likes are in the header
      const header = document.querySelector(this.selectors.metrics.likes);
      let likesStr = '';
      if (header) {
        // Look for a number that isn't the username
        const texts = Array.from(header.querySelectorAll('*'))
          .map(el => el.textContent.trim())
          .filter(t => /^[\d.KMB]+$/.test(t));
        likesStr = texts[0] || '';
      }

      const sharesStr = document.querySelector(this.selectors.metrics.shares)?.textContent?.trim();

      return {
        type: EVENT_TYPES.VIEWER_UPDATE,
        timestamp: Date.now(),
        data: {
          viewers: this.parseMetricValue(viewersStr),
          likes: this.parseMetricValue(likesStr),
          shares: this.parseMetricValue(sharesStr)
        }
      };
    } catch (error) {
      logger.error('Error extracting metrics:', error);
      return null;
    }
  }

  parseMetricValue(str) {
    if (!str) return 0;
    const cleanStr = str.toLowerCase().replace(/,/g, '');
    let multiplier = 1;
    
    if (cleanStr.includes('k')) {
      multiplier = 1000;
    } else if (cleanStr.includes('m')) {
      multiplier = 1000000;
    }
    
    const num = parseFloat(cleanStr.replace(/[km]/g, ''));
    return isNaN(num) ? 0 : Math.floor(num * multiplier);
  }
}
