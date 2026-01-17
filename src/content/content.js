import { logger } from '../utils/logger.js';
import { DataExtractor } from './data-extractor.js';
import { DOMObserver } from './dom-observer.js';
import { RuleEngine } from '../analysis/rule-engine.js';
import { SentimentAnalyzer } from '../analysis/sentiment-analyzer.js';
import { AnomalyDetector } from '../analysis/anomaly-detector.js';
import { AIGenerator } from '../analysis/ai-generator.js';
import { Dashboard } from '../dashboard/dashboard.js';
import { CommentBot } from './comment-bot.js';
import { APP_CONFIG, EVENT_TYPES } from '../utils/constants.js';
import { TranscriptionService } from '../analysis/transcription-service.js';

class ContentScript {
  constructor() {
    this.selectors = null;
    this.extractor = null;
    this.observer = null;
    this.ruleEngine = null;
    this.sentimentAnalyzer = null;
    this.anomalyDetector = null;
    this.dashboard = null;
    this.commentBot = null;
    this.aiGenerator = null;
    this.transcriptionService = null;
    this.isInitialized = false;
    this.checkInterval = null;
    this.currentUrl = window.location.href;
    this.productMentions = new Map(); // Store mentions count for each product
  }

  async init() {
    this.startUrlMonitor();
    this.checkAndInit();
  }

  startUrlMonitor() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      if (this.currentUrl !== window.location.href) {
        this.currentUrl = window.location.href;
        logger.debug('URL changed to:', this.currentUrl);
        this.checkAndInit();
      }
    }, 1000);
  }

  isLivePage() {
    return window.location.href.includes('/live');
  }

  async checkAndInit() {
    if (!this.isLivePage()) {
      if (this.dashboard) this.dashboard.destroy();
      if (this.observer) this.observer.stop();
      this.isInitialized = false;
      return;
    }

    if (this.isInitialized) {
      if (this.dashboard) this.dashboard.show();
      return;
    }

    try {
      logger.info('Initializing Content Script for Live...');

      const intentRules = await this.loadConfig('/config/intent-rules.json');
      const sentimentLexicon = await this.loadConfig('/config/sentiment-lexicon.json');
      const selectors = await this.loadConfig('/config/selectors.json');

      if (!selectors || !selectors.comment || !selectors.metrics) {
        logger.error('Invalid or missing selectors config, aborting initialization');
        return;
      }
      this.selectors = selectors;

      this.extractor = new DataExtractor(this.selectors);
      this.ruleEngine = new RuleEngine(intentRules);
      this.sentimentAnalyzer = new SentimentAnalyzer(sentimentLexicon);
      this.anomalyDetector = new AnomalyDetector();
      this.dashboard = new Dashboard();
      this.commentBot = new CommentBot();
      this.aiGenerator = new AIGenerator();
      this.transcriptionService = new TranscriptionService(this.aiGenerator);

      // Link generator to bot
      this.commentBot.aiGenerator = this.aiGenerator;

      this.dashboard.onAiConfigChange = (config) => this.commentBot.setAiConfig(config);
      this.dashboard.onPeriodicConfigChange = (config) => this.commentBot.setPeriodicConfig(config);
      this.dashboard.onAiManualTrigger = () => this.commentBot.postPeriodicComment(true);
      this.commentBot.onAction = () => this.dashboard.show();

      await this.injectDashboard();
      this.dashboard.syncConfig();

      this.observer = new DOMObserver(
        this.selectors,
        (element) => this.handleNewComment(element),
        (element) => this.handleNewGift(element)
      );
      this.observer.start();
      this.startMetricsPolling();
      this.startAiActivityPolling();
      this.startTranscriptionPolling();

      this.isInitialized = true;
      logger.info('Content Script initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Content Script:', error);
    }
  }

  async injectDashboard() {
    if (!document.body) {
      logger.warn('document.body not found, skipping injection');
      return;
    }
    const container = document.createElement('div');
    container.id = 'tli-shadow-root';
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: 'open' });

    // Load CSS
    const cssUrl = chrome.runtime.getURL('src/dashboard/dashboard.css');
    const cssRes = await fetch(cssUrl);
    const cssText = await cssRes.text();
    const style = document.createElement('style');
    style.textContent = cssText;
    shadow.appendChild(style);

    // Load HTML
    const htmlUrl = chrome.runtime.getURL('src/dashboard/dashboard.html');
    const htmlRes = await fetch(htmlUrl);
    const htmlText = await htmlRes.text();
    const temp = document.createElement('div');
    temp.innerHTML = htmlText;
    shadow.appendChild(temp.firstChild);

    this.dashboard.render(shadow);
  }

  async loadConfig(path) {
    try {
      const url = chrome.runtime.getURL(path);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error(`Error loading config from ${path}:`, error.message);
      return null;
    }
  }

  handleNewComment(element) {
    const commentData = this.extractor.extractComment(element);
    if (commentData) {
      const analysis = this.ruleEngine.analyze(commentData.data.text);
      const sentiment = this.sentimentAnalyzer.analyze(commentData.data.text);

      commentData.data.intent = analysis.intent;
      commentData.data.priority = analysis.priority;
      commentData.data.sentiment = sentiment;

      // --- PRO FEATURE: PRODUCT DEMAND TRACKING ---
      if (this.dashboard && this.dashboard.products) {
        this.dashboard.products.forEach(product => {
          const title = product.title.toLowerCase();
          const text = commentData.data.text.toLowerCase();
          if (text.includes(title) || (title.length > 5 && text.includes(title.substring(0, 5)))) {
            const currentCount = this.productMentions.get(product.id) || 0;
            this.productMentions.set(product.id, currentCount + 1);
            logger.debug(`Product Mention Detected: ${product.title} (${currentCount + 1})`);
          }
        });
      }
      // ---------------------------------------------

      // Add to AI context
      if (this.aiGenerator) {
        this.aiGenerator.addContext(commentData.data);
      }

      logger.debug('New comment analyzed:', commentData);

      // AI Auto-Response Logic
      if (this.commentBot && analysis.responses && analysis.responses.length > 0) {
        // Only auto-respond to high priority or specific intents
        const randomResponse = analysis.responses[Math.floor(Math.random() * analysis.responses.length)];
        this.commentBot.postComment(randomResponse);
      }

      // Update UI if high priority or interesting
      if (commentData.data.priority !== 'low' || Math.abs(sentiment) > 0.5) {
        this.dashboard.addComment(commentData.data);
      }

      this.sendToBackground(commentData);
    }
  }

  handleNewGift(element) {
    const giftData = this.extractor.extractGift(element);
    if (giftData) {
      logger.info('New gift detected:', giftData);
      if (this.dashboard) {
        this.dashboard.addGift(giftData.data);
      }
      this.sendToBackground(giftData);
    }
  }

  startMetricsPolling() {
    setInterval(() => {
      const metrics = this.extractor.extractMetrics();
      if (metrics && metrics.data) {
        // Run anomaly detection
        const alerts = this.anomalyDetector.addDataPoint(metrics.data.viewers, metrics.data.commentCount || 0);

        if (alerts && alerts.length > 0) {
          alerts.forEach(alert => {
            this.dashboard.addAlert(alert);
            this.sendToBackground({ type: 'ALERT', data: alert });
          });
        }

        this.dashboard.updateMetrics(metrics.data);
        this.sendToBackground(metrics);
      }

      // Extract products
      const products = this.extractor.extractProducts().map(p => ({
        ...p,
        mentions: this.productMentions.get(p.id) || 0
      }));

      if (products && products.length >= 0) {
        this.dashboard.updateProducts(products);
      }
    }, APP_CONFIG.UPDATE_INTERVAL);
  }

  startAiActivityPolling() {
    setInterval(() => {
      if (this.commentBot && this.dashboard) {
        const stats = this.commentBot.getDeepStats();

        // Add summary info to stats
        if (this.transcriptionService) {
          stats.lastSummary = this.transcriptionService.summaryHistory.length > 0
            ? this.transcriptionService.summaryHistory[this.transcriptionService.summaryHistory.length - 1].text
            : null;
          stats.isSummaryLoading = this.transcriptionService.isProcessing;
        }

        this.dashboard.updateAiStats(stats);
      }
    }, 1000); // 1s for professional countdown
  }

  startTranscriptionPolling() {
    // Generate summary every 2 minutes
    setInterval(async () => {
      if (this.transcriptionService && this.commentBot && this.commentBot.useVoice) {
        logger.info('ContentScript: Triggering scheduled live summary...');
        const audioData = await this.commentBot.captureVoiceSnippet(5000); // 5s snippet
        if (audioData) {
          await this.transcriptionService.generateSummary(audioData);
        }
      }
    }, 120000);
  }

  sendToBackground(event) {
    try {
      chrome.runtime.sendMessage(event);
    } catch (error) {
      // Background might be disconnected
    }
  }
}

const contentScript = new ContentScript();
contentScript.init();
