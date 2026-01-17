import { logger } from '../utils/logger.js';

export class DOMObserver {
  constructor(selectors, onCommentCallback, onGiftCallback) {
    this.selectors = selectors;
    this.onCommentCallback = onCommentCallback;
    this.onGiftCallback = onGiftCallback;
    this.observer = null;
  }

  start() {
    logger.info('Starting DOM Observer...');
    this.observeLoop();
  }

  observeLoop() {
    this.checkExist = setInterval(() => {
      if (!this.selectors || !this.selectors.comment) {
        logger.warn('Selectors not ready in DOMObserver');
        return;
      }

      const firstComment = document.querySelector(this.selectors.comment.container);
      if (firstComment) {
        const container = firstComment.parentElement;
        if (container) {
          this.initMutationObserver(container);
          clearInterval(this.checkExist);
          this.checkExist = null;
        }
      }
    }, 2000);
  }

  initMutationObserver(container) {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check Comments
              if (node.matches(this.selectors.comment.container)) {
                this.onCommentCallback(node);
              } else {
                const comments = node.querySelectorAll(this.selectors.comment.container);
                comments.forEach(c => this.onCommentCallback(c));
              }

              // Check Gifts
              if (this.selectors.gift) {
                if (node.matches(this.selectors.gift.container)) {
                  this.onGiftCallback(node);
                } else {
                  const gifts = node.querySelectorAll(this.selectors.gift.container);
                  gifts.forEach(g => this.onGiftCallback(g));
                }
              }
            }
          }
        }
      }
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true
    });

    logger.info('MutationObserver initialized with Gift tracking');
  }

  stop() {
    if (this.checkExist) {
      clearInterval(this.checkExist);
      this.checkExist = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      logger.info('DOM Observer stopped');
    }
  }
}
