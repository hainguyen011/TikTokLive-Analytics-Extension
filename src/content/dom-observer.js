import { logger } from '../utils/logger.js';

export class DOMObserver {
  constructor(selectors, onCommentCallback) {
    this.selectors = selectors;
    this.onCommentCallback = onCommentCallback;
    this.observer = null;
  }

  start() {
    logger.info('Starting DOM Observer...');
    
    // We need to find the container that holds the comments
    // TikTok comments are often in a scrollable list
    // We'll look for the container in a loop until it appears
    this.observeLoop();
  }

  observeLoop() {
    this.checkExist = setInterval(() => {
      // Defensive checks
      if (!this.selectors || !this.selectors.comment) {
        logger.warn('Selectors not ready in DOMObserver');
        return;
      }
      
      // Note: We might need a more specific selector for the comment list container
      // For now, we'll try to find any element matching the comment selector's parent
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
              // Check if the added node is a comment or contains comments
              if (node.matches(this.selectors.comment.container)) {
                this.onCommentCallback(node);
              } else {
                const comments = node.querySelectorAll(this.selectors.comment.container);
                comments.forEach(c => this.onCommentCallback(c));
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
    
    logger.info('MutationObserver initialized on container');
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
