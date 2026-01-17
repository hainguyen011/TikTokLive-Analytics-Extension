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

  extractProducts() {
    try {
      if (!this.selectors?.product) return [];

      const productCards = document.querySelectorAll(this.selectors.product.card);
      const products = [];

      productCards.forEach((card, index) => {
        const title = card.querySelector(this.selectors.product.title)?.textContent?.trim();
        const price = card.querySelector(this.selectors.product.price)?.textContent?.trim();
        const image = card.querySelector('img')?.src;
        const isPinned = card.classList.contains('pinned') || !!card.querySelector('.pinned-label'); // Simple heuristic

        if (title) {
          products.push({
            id: `p_${index}_${title.substring(0, 5)}`,
            title,
            price,
            image,
            isPinned,
            timestamp: Date.now()
          });
        }
      });

      return products;
    } catch (error) {
      logger.error('Error extracting products:', error);
      return [];
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

  extractGift(element) {
    try {
      if (!this.selectors?.gift) return null;

      const username = element.querySelector(this.selectors.comment.username)?.textContent?.trim();
      const giftName = element.querySelector(this.selectors.gift.name)?.textContent?.trim();
      const giftCountStr = element.querySelector(this.selectors.gift.count)?.textContent?.trim() || '1';
      const giftIcon = element.querySelector(this.selectors.gift.icon)?.src;

      if (!giftName) return null;

      const giftCount = parseInt(giftCountStr.replace(/x/i, '')) || 1;

      return {
        type: EVENT_TYPES.GIFT, // Assuming this is defined
        timestamp: Date.now(),
        data: {
          id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          username,
          giftName,
          giftCount,
          giftIcon,
          // Diamond estimation (rough values for common gifts)
          diamonds: this.estimateDiamonds(giftName) * giftCount
        }
      };
    } catch (error) {
      logger.error('Error extracting gift:', error);
      return null;
    }
  }

  estimateDiamonds(name) {
    const giftValues = {
      'Rose': 1,
      'TikTok': 1,
      'Finger Heart': 5,
      'Mic': 5,
      'Panda': 5,
      'Ice Cream': 1,
      'Love You': 5,
      'Doughnut': 30,
      'Confetti': 100,
      'Cap': 99,
      'Paper Crane': 99,
      'Crown': 199,
      'Gem': 15,
      'Lion': 29999,
      'Universe': 34999
    };

    // Pattern matching for Vietnamese names or other variations
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(giftValues)) {
      if (lowerName.includes(key.toLowerCase())) return value;
    }

    return 1; // Default
  }
}
