import { formatNumber } from '../utils/helpers.js';

export class Dashboard {
  constructor() {
    this.root = null;
    this.container = null;
    this.isMinimized = false;
    this.activeTab = 'metrics';
    this.alerts = [];
    this.comments = [];
    this.onAiToggle = null;
    this.onAiConfigChange = null;
    this.onPeriodicConfigChange = null;
    this.onAiManualTrigger = null;
    this.isExpanded = false;
  }

  async mount() {
    const response = await fetch(chrome.runtime.getURL('src/dashboard/dashboard.html'));
    const html = await response.json(); // Wait, it's HTML, not JSON
    // Correct way to get HTML:
    // const html = await response.text();
    // But wait, the content script's loader will handle injection.
  }

  // Since we are in a content script environment, we'll create the DOM manually or via template
  render(root) {
    this.root = root;
    this.container = root.querySelector('.tli-container');
    this.setupEventListeners(root);
  }

  setupEventListeners(root) {
    const handle = root.querySelector('#tli-drag-handle');
    this.makeDraggable(handle, this.container);

    root.querySelectorAll('.tli-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab, root));
    });

    const btnMinimize = root.querySelector('#tli-minimize');
    const btnClose = root.querySelector('#tli-close');
    const btnManualAi = root.querySelector('#tli-btn-ai-manual');

    if (btnMinimize) btnMinimize.addEventListener('click', () => this.toggleMinimize());
    if (btnClose) btnClose.addEventListener('click', () => this.destroy());
    if (root.querySelector('#tli-expand')) {
      root.querySelector('#tli-expand').addEventListener('click', () => this.toggleExpansion());
    }
    if (btnManualAi) {
      btnManualAi.addEventListener('click', () => {
        if (this.onAiManualTrigger) this.onAiManualTrigger();
      });
    }

    // AI Logic
    const toggleAi = root.querySelector('#tli-toggle-ai');
    const inputApiKey = root.querySelector('#tli-input-apikey');
    const inputPersona = root.querySelector('#tli-input-persona');
    const inputTopics = root.querySelector('#tli-input-topics');
    const selectStyle = root.querySelector('#tli-select-style');
    const toggleUseAi = root.querySelector('#tli-toggle-use-ai');
    const inputInterval = root.querySelector('#tli-input-interval');
    const inputTemplates = root.querySelector('#tli-input-templates');
    const toggleVision = root.querySelector('#tli-toggle-vision');
    const toggleVoice = root.querySelector('#tli-toggle-voice');

    const handleAiChange = () => {
      if (this.onAiConfigChange && inputApiKey) {
        this.onAiConfigChange({
          enabled: toggleAi ? toggleAi.checked : false,
          apiKey: inputApiKey.value,
          persona: inputPersona ? inputPersona.value : '',
          topics: inputTopics ? inputTopics.value : '',
          style: selectStyle ? selectStyle.value : 'Friendly'
        });
      }
    };

    const handlePeriodicChange = () => {
      if (this.onPeriodicConfigChange && inputInterval && inputTemplates && toggleUseAi) {
        this.onPeriodicConfigChange({
          enabled: toggleUseAi.checked,
          interval: parseInt(inputInterval.value),
          templates: inputTemplates.value.split('\n').filter(t => t.trim()),
          useAi: toggleUseAi.checked,
          apiKey: inputApiKey ? inputApiKey.value : '',
          persona: inputPersona ? inputPersona.value : '',
          vision: toggleVision ? toggleVision.checked : false,
          voice: toggleVoice ? toggleVoice.checked : false
        });
      }
    };

    if (toggleAi) toggleAi.addEventListener('change', handleAiChange);
    if (inputApiKey) inputApiKey.addEventListener('input', handleAiChange);
    if (inputPersona) inputPersona.addEventListener('input', handleAiChange);
    if (inputTopics) inputTopics.addEventListener('input', handleAiChange);
    if (selectStyle) selectStyle.addEventListener('change', handleAiChange);

    if (toggleUseAi) toggleUseAi.addEventListener('change', handlePeriodicChange);
    if (inputInterval) inputInterval.addEventListener('input', handlePeriodicChange);
    if (inputTemplates) inputTemplates.addEventListener('input', handlePeriodicChange);
    if (toggleVision) toggleVision.addEventListener('change', handlePeriodicChange);
    if (toggleVoice) toggleVoice.addEventListener('change', handlePeriodicChange);
  }

  makeDraggable(handle, element) {
    let startX, startY, initialLeft, initialTop;

    const onMouseMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      element.style.left = (initialLeft + dx) + 'px';
      element.style.top = (initialTop + dy) + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      element.style.cursor = 'default';
      handle.style.cursor = 'grab';
    };

    handle.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons, inputs, or selects
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) {
        return;
      }

      e.preventDefault();

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      startX = e.clientX;
      startY = e.clientY;

      // Force absolute positioning via fixed
      element.style.position = 'fixed';
      element.style.left = initialLeft + 'px';
      element.style.top = initialTop + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.margin = '0';

      element.style.cursor = 'grabbing';
      handle.style.cursor = 'grabbing';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    handle.style.cursor = 'grab';
  }

  switchTab(tabId, root) {
    this.activeTab = tabId;
    root.querySelectorAll('.tli-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    root.querySelectorAll('.tli-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tli-panel-${tabId}`));
  }

  updateMetrics(data) {
    if (!this.root) return;
    const viewersEl = this.root.querySelector('#tli-metric-viewers');
    const likesEl = this.root.querySelector('#tli-metric-likes');
    
    if (viewersEl) viewersEl.textContent = formatNumber(data.viewers);
    if (likesEl) likesEl.textContent = formatNumber(data.likes);
  }

  updateAiStats(stats) {
    if (!this.root) return;
    
    const totalEl = this.root.querySelector('#tli-ai-stat-total');
    const latencyEl = this.root.querySelector('#tli-ai-stat-latency');
    const countdownEl = this.root.querySelector('#tli-ai-stat-countdown');
    const visionEl = this.root.querySelector('#tli-ai-stat-vision');
    const voiceEl = this.root.querySelector('#tli-ai-stat-voice');
    const pulseEl = this.root.querySelector('#tli-ai-status-pulse');

    if (totalEl) totalEl.textContent = stats.totalSent || 0;
    if (latencyEl) latencyEl.textContent = `${stats.latency || 0}ms`;
    if (countdownEl) {
      countdownEl.textContent = stats.nextScheduledIn !== null ? `${stats.nextScheduledIn}s` : '--';
      countdownEl.style.color = stats.nextScheduledIn < 5 ? '#ff0050' : 'var(--tli-primary)';
    }
    if (visionEl) visionEl.textContent = stats.sentVision || 0;
    if (voiceEl) voiceEl.textContent = stats.sentVoice || 0;
    
    const syncEl = this.root.querySelector('#tli-ai-stat-sync');
    if (syncEl) {
      if (stats.sentVoice > 0) {
        syncEl.textContent = 'Synced & Calibrated';
        syncEl.style.color = 'var(--tli-primary)';
      } else {
        syncEl.textContent = 'Scanning Vibe...';
        syncEl.style.color = 'var(--tli-text-dim)';
      }
    }
    
    if (pulseEl) {
      pulseEl.style.background = stats.isPeriodicActive ? 'var(--tli-primary)' : 'var(--tli-text-dim)';
      pulseEl.style.animation = stats.isPeriodicActive ? 'tli-pulse-anim 2s infinite' : 'none';
    }

    // Sensory Gallery Updates
    const visionPreview = this.root.querySelector('#tli-ai-preview-vision');
    const voiceTimeEl = this.root.querySelector('#tli-ai-stat-voice-time');
    
    if (visionPreview && stats.lastVisionData) {
      if (visionPreview.src !== stats.lastVisionData) {
        visionPreview.src = stats.lastVisionData;
        // Flicker effect for new hit
        visionPreview.style.opacity = '0.3';
        setTimeout(() => visionPreview.style.opacity = '1', 100);
      }
    }
    
    if (voiceTimeEl && stats.lastVoiceTime > 0) {
      const date = new Date(stats.lastVoiceTime);
      voiceTimeEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  addComment(comment) {
    if (!this.root) return;
    const list = this.root.querySelector('#tli-comments-list');
    if (!list) return;

    // Remove placeholder if it exists
    if (this.comments.length === 0) list.innerHTML = '';

    const card = document.createElement('div');
    card.className = `tli-comment-card`;
    card.style.borderLeftColor = comment.priority === 'high' ? '#ff0050' : (comment.priority === 'medium' ? '#f59e0b' : '#10b981');
    
    card.innerHTML = `
      <div class="tli-comment-user">@${comment.username}</div>
      <div class="tli-comment-text">${comment.text}</div>
      <div class="tli-comment-meta">
        <span class="tli-tag tli-tag-${comment.priority}">${comment.intent}</span>
        <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;

    list.prepend(card);
    this.comments.push(comment);

    // Keep only last 20
    if (list.children.length > 20) {
      list.lastElementChild.remove();
    }
  }

  addAlert(alert) {
    if (!this.root) return;
    const list = this.root.querySelector('#tli-alerts-list');
    if (!list) return;

    if (this.alerts.length === 0) list.innerHTML = '';

    const card = document.createElement('div');
    card.className = `tli-comment-card`; // Reuse style for simplicity
    card.style.borderLeftColor = alert.severity === 'critical' ? '#ef4444' : '#f59e0b';
    
    card.innerHTML = `
      <div class="tli-comment-user" style="color: white">${alert.type.toUpperCase()}</div>
      <div class="tli-comment-text">${alert.message}</div>
      <div class="tli-comment-meta" style="color: #00f2ea">
        💡 ${alert.suggestion}
      </div>
    `;

    list.prepend(card);
    this.alerts.push(alert);
    
    const badge = this.root.querySelector('#tli-alert-count');
    if (badge) badge.textContent = `(${this.alerts.length})`;
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.updateVisibility();
  }

  toggleExpansion() {
    this.isExpanded = !this.isExpanded;
    this.container.classList.toggle('expanded', this.isExpanded);
    const btn = this.root.querySelector('#tli-expand');
    if (btn) btn.textContent = this.isExpanded ? '🗗' : '🔳';
  }

  show() {
    this.isMinimized = false;
    this.updateVisibility();
  }

  updateVisibility() {
    this.container.querySelector('.tli-content').classList.toggle('hidden', this.isMinimized);
    this.container.querySelector('.tli-tabs').classList.toggle('hidden', this.isMinimized);
    this.container.querySelector('#tli-minimize').textContent = this.isMinimized ? '+' : '−';
  }

  syncConfig() {
    if (!this.root) return;
    
    // Select the handler functions defined in setupEventListeners context
    // Actually, it's easier to just manually trigger the logic for config sync
    const inputApiKey = this.root.querySelector('#tli-input-apikey');
    const inputPersona = this.root.querySelector('#tli-input-persona');
    const inputTopics = this.root.querySelector('#tli-input-topics');
    const selectStyle = this.root.querySelector('#tli-select-style');
    const toggleAi = this.root.querySelector('#tli-toggle-ai');

    const inputInterval = this.root.querySelector('#tli-input-interval');
    const inputTemplates = this.root.querySelector('#tli-input-templates');
    const toggleUseAi = this.root.querySelector('#tli-toggle-use-ai');
    const toggleVision = this.root.querySelector('#tli-toggle-vision');
    const toggleVoice = this.root.querySelector('#tli-toggle-voice');

    if (this.onAiConfigChange && inputApiKey) {
      this.onAiConfigChange({
        enabled: toggleAi ? toggleAi.checked : false,
        apiKey: inputApiKey.value,
        persona: inputPersona ? inputPersona.value : '',
        topics: inputTopics ? inputTopics.value : '',
        style: selectStyle ? selectStyle.value : 'Friendly'
      });
    }

    if (this.onPeriodicConfigChange && inputInterval && inputTemplates && toggleUseAi) {
      this.onPeriodicConfigChange({
        enabled: toggleUseAi.checked,
        interval: parseInt(inputInterval.value),
        templates: inputTemplates.value.split('\n').filter(t => t.trim()),
        useAi: toggleUseAi.checked,
        apiKey: inputApiKey ? inputApiKey.value : '',
        persona: inputPersona ? inputPersona.value : '',
        vision: toggleVision ? toggleVision.checked : false,
        voice: toggleVoice ? toggleVoice.checked : false
      });
    }
  }

  destroy() {
    if (this.container) this.container.remove();
  }
}
