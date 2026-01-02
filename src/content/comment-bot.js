import { logger } from '../utils/logger.js';

export class CommentBot {
  constructor() {
    this.lastActionTime = 0;
    this.cooldown = 15000; // 15 seconds between automated actions
    this.isEnabled = false;
    
    this.periodicInterval = 60000; // Default 1 minute
    this.periodicTemplates = [];
    this.isPeriodicEnabled = false;
    this.periodicTimer = null;
    this.onAction = null;
    this.aiGenerator = null;
    this.useAi = false;
    this.useVision = false;
    this.useVoice = false;

    // AI Activity Stats
    this.aiStats = {
      totalSent: 0,
      sentText: 0,
      sentVision: 0,
      sentVoice: 0,
      styleUsage: {},
      lastSentTime: 0,
      startTime: Date.now()
    };
    this.nextScheduledTime = 0;
    this.lastVisionData = null;
    this.lastVoiceTime = 0;
  }

  setAiConfig(config) {
    this.isEnabled = config.enabled || false;
    if (this.aiGenerator) {
      this.aiGenerator.setSettings({
        apiKey: config.apiKey,
        persona: config.persona,
        topics: config.topics,
        style: config.style
      });
    }
    logger.info(`AI Auto-Response updated: ${this.isEnabled ? 'ON' : 'OFF'}`);
  }

  setPeriodicConfig(config) {
    this.periodicInterval = (config.interval || 30) * 1000;
    this.periodicTemplates = config.templates || [];
    this.isPeriodicEnabled = config.enabled || false;
    this.useAi = config.useAi || false;
    this.useVision = config.vision || false;
    this.useVoice = config.voice || false;

    this.restartPeriodicTimer();
    
    if (config.apiKey && this.aiGenerator) {
      this.aiGenerator.setSettings({
        apiKey: config.apiKey,
        persona: config.persona,
        topics: config.topics,
        style: config.style
      });
    }

    logger.info(`Periodic Engagement updated: ${this.isPeriodicEnabled ? 'ON' : 'OFF'} every ${config.interval} seconds (AI: ${this.useAi})`);
  }

  restartPeriodicTimer() {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }

    if (this.isPeriodicEnabled && (this.periodicTemplates.length > 0 || this.useAi)) {
      this.nextScheduledTime = Date.now() + this.periodicInterval;
      this.periodicTimer = setInterval(() => {
        this.postPeriodicComment();
        this.nextScheduledTime = Date.now() + this.periodicInterval;
      }, this.periodicInterval);
    } else {
      this.nextScheduledTime = 0;
    }
  }

  findMainVideo() {
    // Priority: 1. Video with "player" class, 2. First visible video, 3. Any video
    const allVideos = Array.from(document.querySelectorAll('video'));
    if (allVideos.length === 0) return null;
    
    return allVideos.find(v => v.classList.contains('player') || v.id.includes('player')) || 
           allVideos.find(v => v.offsetWidth > 100) || 
           allVideos[0];
  }

  async captureVisionFrame() {
    const video = this.findMainVideo();
    if (!video) return null;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Return base64 without prefix
      const data = canvas.toDataURL('image/jpeg', 0.6);
      this.lastVisionData = data;
      return data.split(',')[1]; // Ensure base64 without prefix is returned
    } catch (e) {
      logger.error('CommentBot: Vision capture failed', e);
      return null;
    }
  }

  async captureVoiceSnippet(durationMs = 3000) {
    const video = this.findMainVideo();
    if (!video) {
       logger.warn('CommentBot: Reference video for audio capture not found');
       return null;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const dest = this.audioContext.createMediaStreamDestination();
      
      // Attempt 1: createMediaElementSource
      let source;
      try {
        source = this.audioContext.createMediaElementSource(video);
        source.connect(dest);
        source.connect(this.audioContext.destination);
      } catch (e1) {
        logger.debug('CommentBot: createMediaElementSource failed, trying captureStream...', e1.message);
        // Attempt 2: captureStream
        const stream = (video.captureStream || video.mozCaptureStream).call(video);
        source = this.audioContext.createMediaStreamSource(stream);
        source.connect(dest);
      }

      const recorder = new MediaRecorder(dest.stream);
      const chunks = [];
      
      return new Promise((resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = async () => {
          try {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              const audioData = reader.result.split(',')[1];
              this.lastVoiceTime = Date.now();
              resolve(audioData);
            };
            reader.readAsDataURL(blob);
          } catch (err) {
            logger.error('CommentBot: Error processing voice blob', err);
            resolve(null);
          }
        };
        recorder.start();
        setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
        }, durationMs);
      });
    } catch (e) {
      logger.error(`CommentBot: Voice capture failed: [${e.name}] ${e.message}`, e);
      return null;
    }
  }

  async postPeriodicComment(isManual = false) {
    if (!this.isPeriodicEnabled && !isManual) return;
    
    let text = '';
    if (this.useAi && this.aiGenerator) {
      logger.info('CommentBot: Triggering AI generation for periodic comment...');
      
      let imageData = null;
      let audioData = null;

      if (this.useVision) {
        logger.info('CommentBot: Capturing vision frame...');
        imageData = await this.captureVisionFrame();
      }

      if (this.useVoice) {
        logger.info('CommentBot: Capturing voice snippet...');
        audioData = await this.captureVoiceSnippet();
      }

      const chatHistory = this.aiGenerator.contextBuffer.map(c => `${c.username}: ${c.text}`);
      text = await this.aiGenerator.generateComment(chatHistory, imageData, audioData);
      
      if (!text) {
        logger.warn('CommentBot: AI Generation failed, falling back to templates');
      } else {
        logger.info(`CommentBot: AI Generated message: "${text}"`);
        // Track multimodal success
        if (imageData) this.aiStats.sentVision++;
        if (audioData) this.aiStats.sentVoice++;
        if (!imageData && !audioData) this.aiStats.sentText++;
        
        const currentStyle = this.aiGenerator.style || 'Default';
        this.aiStats.styleUsage[currentStyle] = (this.aiStats.styleUsage[currentStyle] || 0) + 1;
      }
    }

    if (!text && this.periodicTemplates.length > 0) {
      text = this.periodicTemplates[Math.floor(Math.random() * this.periodicTemplates.length)];
    }

    if (text) {
      this.postComment(text, 'periodic');
    }
  }

  async postComment(text, type = 'auto-reply') {
    if (!this.isEnabled && type === 'auto-reply') return;
    if (!this.isPeriodicEnabled && type === 'periodic') return;
    
    // If auto-reply and AI Generator is available with Key, use it to enhance the response
    if (type === 'auto-reply' && this.aiGenerator && this.aiGenerator.apiKey) {
      const chatHistory = this.aiGenerator.contextBuffer.map(c => `${c.username}: ${c.text}`);
      
      let imageData = null;
      let audioData = null;

      if (this.useVision) imageData = await this.captureVisionFrame();
      if (this.useVoice) audioData = await this.captureVoiceSnippet();

      const enhancedText = await this.aiGenerator.generateComment(chatHistory, imageData, audioData);
      if (enhancedText) text = enhancedText;
    }

    const now = Date.now();
    // Use a shorter cooldown for periodic if needed, or stick to a global one
    if (now - this.lastActionTime < 5000) { 
      logger.debug('CommentBot: Global action cooldown active, skipping');
      return;
    }

    try {
      // 1. Find the input container (TikTok uses dynamic classes for margin)
      const inputContainer = document.querySelector('div[class*="flex-1"][class*="h-auto"][class*="me-"]') || 
                             document.querySelector('.flex-1.h-auto.me-52') ||
                             document.querySelector('.flex-1.h-auto.me-20');
      if (!inputContainer) {
        logger.warn('CommentBot: Chat input container not found');
        return;
      }

      // 2. Find the contenteditable div
      const input = inputContainer.querySelector('div[contenteditable]');
      if (!input) {
        logger.warn('CommentBot: contenteditable input not found');
        return;
      }

      // 3. Focus and set text
      input.focus();
      
      // Using execCommand is more robust for triggering TikTok's internal state
      // If it fails, we fall back to innerText
      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
      } catch (e) {
        input.innerText = text;
      }

      // 4. Trigger events to make sure UI updates
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 5. Short delay to mimic human behavior
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

      // 6. Send the comment by pressing Enter (verified to work better than .click())
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(enterEvent);
      
      this.lastActionTime = Date.now();
      this.aiStats.totalSent++;
      this.aiStats.lastSentTime = this.lastActionTime;
      
      logger.info(`CommentBot: Posted ${type}: "${text}"`);

      if (this.onAction) this.onAction(type, text);
      
    } catch (error) {
      logger.error('CommentBot: Error posting comment:', error);
    }
  }

  getDeepStats() {
    return {
      ...this.aiStats,
      nextScheduledIn: this.nextScheduledTime > 0 ? Math.max(0, Math.round((this.nextScheduledTime - Date.now()) / 1000)) : null,
      isPeriodicActive: this.isPeriodicEnabled,
      latency: this.aiGenerator ? this.aiGenerator.lastLatency : 0,
      lastVisionData: this.lastVisionData,
      lastVoiceTime: this.lastVoiceTime
    };
  }
}
