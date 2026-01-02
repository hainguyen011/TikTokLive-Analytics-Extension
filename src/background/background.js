import { logger } from '../utils/logger.js';
import { APP_CONFIG, EVENT_TYPES } from '../utils/constants.js';

class BackgroundService {
  constructor() {
    this.buffer = [];
    this.sessionId = null;
    this.isRecording = false;
  }

  init() {
    logger.info('Background Service initialized');
    this.setupListeners();
    this.startHeartbeat();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender);
      return true;
    });

    chrome.runtime.onInstalled.addListener(() => {
      logger.info('Extension installed/updated');
    });
  }

  handleMessage(message, sender) {
    logger.debug('Received message from', sender.tab?.id, ':', message);

    if (message.type === EVENT_TYPES.COMMENT || message.type === EVENT_TYPES.VIEWER_UPDATE) {
      this.addToBuffer(message);
    } else if (message.type === 'ALERT') {
      this.showNotification(message.data);
    }
  }

  addToBuffer(event) {
    this.buffer.push(event);
    if (this.buffer.length >= APP_CONFIG.BATCH_SIZE) {
      this.flushBuffer();
    }
  }

  flushBuffer() {
    if (this.buffer.length === 0) return;
    
    const batch = this.buffer.splice(0);
    logger.info(`Flushing batch of ${batch.length} events`);
    
    // In production, this would send to a backend API
    // For MVP, we might store locally or just log
    this.saveBatchLocally(batch);
  }

  saveBatchLocally(batch) {
    // Basic local storage save for post-live summary
    chrome.storage.local.get(['session_data'], (result) => {
      const data = result.session_data || [];
      chrome.storage.local.set({ session_data: [...data, ...batch] });
    });
  }

  showNotification(alert) {
    if (alert.severity === 'critical') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-128.png',
        title: `TLI: ${alert.type.toUpperCase()}`,
        message: alert.message,
        priority: 2
      });
    }
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.buffer.length > 0) {
        this.flushBuffer();
      }
    }, APP_CONFIG.FLUSH_INTERVAL);
  }
}

const bg = new BackgroundService();
bg.init();
