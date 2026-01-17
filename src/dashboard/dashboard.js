import { formatNumber } from '../utils/helpers.js';

export class Dashboard {
  constructor() {
    this.root = null;
    this.container = null;
    this.isMinimized = false;
    this.activeTab = 'metrics';
    this.alerts = [];
    this.comments = [];
    this.products = [];
    this.gifts = [];
    this.totalDiamonds = 0;
    this.sentimentHistory = [];
    this.onAiToggle = null;
    this.onAiConfigChange = null;
    this.onPeriodicConfigChange = null;
    this.onAiManualTrigger = null;
    this.isExpanded = false;
    this.parsedProducts = new Set();
  }

  async mount() {
    // Correct way to get HTML:
    // const response = await fetch(chrome.runtime.getURL('src/dashboard/dashboard.html'));
    // const html = await response.text();
    // But content script's loader handles injection.
  }

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

    // Delegate copy events
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('tli-btn-copy')) {
        const text = e.target.dataset.copy;
        this.copyToClipboard(text);
        const originalText = e.target.textContent;
        e.target.textContent = 'ĐÃ SAO CHÉP!';
        setTimeout(() => e.target.textContent = originalText, 2000);
      }
    });

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

    // New Product Context Elements
    const inputProductSource = root.querySelector('#tli-input-product-source');
    const btnScanProduct = root.querySelector('#tli-btn-scan-product');
    const btnImportLive = root.querySelector('#tli-btn-import-live');
    const btnClearProducts = root.querySelector('#tli-btn-clear-products');
    const inputProductContext = root.querySelector('#tli-input-product-context'); // Hidden

    // UI Helpers for Products
    const updateProductContext = () => {
      if (inputProductContext) {
        inputProductContext.value = Array.from(this.parsedProducts).join('\n');
        // Trigger change to update AI
        handleAiChange();
        handlePeriodicChange();

        // Update count
        const countEl = root.querySelector('#tli-product-count');
        if (countEl) countEl.textContent = `${this.parsedProducts.size} SP`;
      }
    };

    const addProduct = (name) => {
      if (!name || name.trim().length < 2) return;
      this.parsedProducts.add(name.trim());
      renderChips();
      updateProductContext();
    };

    const renderChips = () => {
      const container = root.querySelector('#tli-product-chips');
      if (!container) return;

      if (this.parsedProducts.size === 0) {
        container.innerHTML = `<div style="width: 100%; text-align: center; color: var(--tli-text-dim); font-size: 10px; padding: 10px;">Chưa có sản phẩm nào.</div>`;
        return;
      }

      container.innerHTML = '';
      this.parsedProducts.forEach(product => {
        const chip = document.createElement('div');
        chip.className = 'tli-tag';
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '4px';
        chip.style.background = 'rgba(255, 215, 0, 0.1)';
        chip.style.border = '1px solid rgba(255, 215, 0, 0.3)';
        chip.style.color = '#ffd700';
        chip.style.padding = '2px 6px';
        chip.style.borderRadius = '12px';
        chip.style.fontSize = '10px';

        chip.innerHTML = `
          <span>${product}</span>
          <span class="tli-chip-remove" style="cursor: pointer; opacity: 0.7; font-weight: bold; margin-left: 2px;">×</span>
        `;

        chip.querySelector('.tli-chip-remove').addEventListener('click', () => {
          this.parsedProducts.delete(product);
          renderChips();
          updateProductContext();
        });

        container.appendChild(chip);
      });
    };

    const handleAiChange = () => {
      if (this.onAiConfigChange && inputApiKey) {
        this.onAiConfigChange({
          enabled: toggleAi ? toggleAi.checked : false,
          apiKey: inputApiKey.value,
          persona: inputPersona ? inputPersona.value : '',
          topics: inputTopics ? inputTopics.value : '',
          style: selectStyle ? selectStyle.value : 'Friendly',
          productContext: inputProductContext ? inputProductContext.value : ''
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
          voice: toggleVoice ? toggleVoice.checked : false,
          productContext: inputProductContext ? inputProductContext.value : ''
        });
      }
    };

    if (toggleAi) toggleAi.addEventListener('change', handleAiChange);
    if (inputApiKey) inputApiKey.addEventListener('input', handleAiChange);
    if (inputPersona) inputPersona.addEventListener('input', handleAiChange);
    if (inputTopics) inputTopics.addEventListener('input', handleAiChange);
    if (selectStyle) selectStyle.addEventListener('change', handleAiChange);

    // Button Handlers
    if (btnScanProduct && inputProductSource) {
      btnScanProduct.addEventListener('click', async () => {
        const val = inputProductSource.value.trim();
        if (!val) return;

        const statusEl = root.querySelector('#tli-product-list-status');
        if (statusEl) statusEl.textContent = 'Đang xử lý...';

        if (val.startsWith('http')) {
          try {
            if (val.includes('shop')) {
              addProduct(`Link: ${val}`);
              if (statusEl) statusEl.textContent = 'Đã thêm Link';
            } else {
              addProduct(val);
            }
          } catch (e) {
            addProduct(val);
          }
        } else {
          const items = val.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
          items.forEach(addProduct);
          if (statusEl) statusEl.textContent = `Đã thêm ${items.length} mục`;
        }

        inputProductSource.value = '';
      });
    }

    if (btnImportLive) {
      btnImportLive.addEventListener('click', () => {
        let count = 0;
        if (this.products && this.products.length > 0) {
          this.products.forEach(p => {
            if (!this.parsedProducts.has(p.title)) {
              this.parsedProducts.add(p.title);
              count++;
            }
          });
          renderChips();
          updateProductContext();
          const statusEl = root.querySelector('#tli-product-list-status');
          if (statusEl) statusEl.textContent = `Đã nhập ${count} từ Live`;
        } else {
          const statusEl = root.querySelector('#tli-product-list-status');
          if (statusEl) statusEl.textContent = 'Không tìm thấy SP trên Live';
        }
      });
    }

    if (btnClearProducts) {
      btnClearProducts.addEventListener('click', () => {
        this.parsedProducts.clear();
        renderChips();
        updateProductContext();
      });
    }

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
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) {
        return;
      }

      e.preventDefault();

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      startX = e.clientX;
      startY = e.clientY;

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
        syncEl.textContent = 'Đã đồng bộ & Hiệu chuẩn';
        syncEl.style.color = 'var(--tli-primary)';
      } else {
        syncEl.textContent = 'Đang quét rung cảm...';
        syncEl.style.color = 'var(--tli-text-dim)';
      }
    }

    if (pulseEl) {
      pulseEl.style.background = stats.isPeriodicActive ? 'var(--tli-primary)' : 'var(--tli-text-dim)';
      pulseEl.style.animation = stats.isPeriodicActive ? 'tli-pulse-anim 2s infinite' : 'none';
    }

    if (stats.lastSummary) {
      this.updateSummary(stats.lastSummary, stats.isSummaryLoading);
    }

    const visionPreview = this.root.querySelector('#tli-ai-preview-vision');
    const voiceTimeEl = this.root.querySelector('#tli-ai-stat-voice-time');

    if (visionPreview && stats.lastVisionData) {
      if (visionPreview.src !== stats.lastVisionData) {
        visionPreview.src = stats.lastVisionData;
        visionPreview.style.opacity = '0.3';
        setTimeout(() => visionPreview.style.opacity = '1', 100);
      }
    }

    if (voiceTimeEl && stats.lastVoiceTime > 0) {
      const date = new Date(stats.lastVoiceTime);
      voiceTimeEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  updateSummary(summary, isLoading) {
    if (!this.root) return;
    const summaryText = this.root.querySelector('#tli-ai-summary-text');
    const summaryLoading = this.root.querySelector('#tli-ai-summary-loading');

    if (summaryText && summary) {
      summaryText.textContent = summary;
    }
    if (summaryLoading) {
      summaryLoading.style.display = isLoading ? 'block' : 'none';
    }
  }

  addComment(comment) {
    if (!this.root) return;
    const list = this.root.querySelector('#tli-comments-list');
    if (!list) return;

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

    if (list.children.length > 20) {
      list.lastElementChild.remove();
    }

    // Update Vibe
    if (comment.sentiment !== undefined) {
      this.updateVibe(comment.sentiment);
    }
  }

  updateVibe(sentiment) {
    if (!this.root) return;
    this.sentimentHistory.push(sentiment);
    if (this.sentimentHistory.length > 20) this.sentimentHistory.shift();

    const avg = this.sentimentHistory.reduce((a, b) => a + b, 0) / this.sentimentHistory.length;
    const percent = ((avg + 1) / 2) * 100;

    const bar = this.root.querySelector('#tli-vibe-bar');
    const status = this.root.querySelector('#tli-vibe-status');

    if (bar) bar.style.width = `${percent}%`;
    if (status) {
      if (avg > 0.4) status.textContent = 'Rất tích cực 🔥';
      else if (avg > 0.1) status.textContent = 'Vui vẻ 😊';
      else if (avg < -0.4) status.textContent = 'Tiêu cực ⚠️';
      else if (avg < -0.1) status.textContent = 'Trầm lắng 🧊';
      else status.textContent = 'Bình thường 😐';
    }
  }

  addGift(gift) {
    if (!this.root) return;
    const list = this.root.querySelector('#tli-gifts-list');
    if (!list) return;

    if (this.gifts.length === 0) list.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'tli-comment-card';
    card.style.background = 'rgba(0, 242, 234, 0.05)';
    card.style.borderLeftColor = '#00f2ea';

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="${gift.giftIcon || ''}" style="width: 24px; height: 24px; border-radius: 4px;">
        <div style="flex: 1;">
          <div class="tli-comment-user">@${gift.username}</div>
          <div class="tli-comment-text">Đã tặng <strong>${gift.giftName}</strong> x${gift.giftCount}</div>
        </div>
        <div style="text-align: right; font-weight: bold; color: #ffd700;">
          +${gift.diamonds} 💎
        </div>
      </div>
    `;

    list.prepend(card);
    this.gifts.push(gift);
    this.totalDiamonds += gift.diamonds;

    const totalEl = this.root.querySelector('#tli-gift-total-diamonds');
    const countEl = this.root.querySelector('#tli-gift-count');
    if (totalEl) totalEl.textContent = `${this.totalDiamonds} 💎`;
    if (countEl) countEl.textContent = this.gifts.length;

    if (list.children.length > 30) {
      list.lastElementChild.remove();
    }
  }

  updateProducts(products) {
    if (!this.root) return;
    const list = this.root.querySelector('#tli-products-list');
    if (!list) return;

    // Sort by mentions for "Hot" effect
    const sortedProducts = [...products].sort((a, b) => (b.mentions || 0) - (a.mentions || 0));

    // Check if data actually changed to avoid re-rendering
    const productIds = sortedProducts.map(p => `${p.id}_${p.mentions}`).join(',');
    const currentIds = this.products.map(p => `${p.id}_${p.mentions}`).join(',');
    if (productIds === currentIds && products.length > 0) return;

    this.products = products;

    if (sortedProducts.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--tli-text-dim); padding: 40px 20px;">
          <p style="font-size: 11px;">Không tìm thấy sản phẩm nào trong live.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    sortedProducts.forEach(product => {
      const mentions = product.mentions || 0;
      const heatPercent = Math.min(100, (mentions / 20) * 100);

      const card = document.createElement('div');
      card.className = 'tli-product-item';
      if (product.isPinned) card.classList.add('pinned');

      card.innerHTML = `
        <div class="tli-product-image">
          <img src="${product.image || 'https://via.placeholder.com/60'}" alt="${product.title}">
          ${product.isPinned ? '<span class="tli-pinned-badge">ĐÃ GHIM</span>' : ''}
        </div>
        <div class="tli-product-info">
          <div class="tli-product-title">${product.title}</div>
          <div class="tli-product-price">${product.price || '---'}</div>
          
          <div class="tli-product-demand">
            <div class="tli-demand-label">
              <span>Mức độ quan tâm</span>
              <span>${mentions} lượt nhắc</span>
            </div>
            <div class="tli-demand-bar-bg">
              <div class="tli-demand-bar-fill" style="width: ${heatPercent}%"></div>
            </div>
          </div>

          <div class="tli-product-actions">
            <button class="tli-btn-product tli-btn-copy" data-copy="${product.title} - ${product.price}">Sao chép nhanh</button>
            <button class="tli-btn-product" onclick="window.open(window.location.href)">Xem</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  addAlert(alert) {
    if (!this.root) return;
    const list = this.root.querySelector('#tli-alerts-list');
    if (!list) return;

    if (this.alerts.length === 0) list.innerHTML = '';

    const card = document.createElement('div');
    card.className = `tli-comment-card`;
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
    const inputProductContext = this.root.querySelector('#tli-input-product-context');

    if (this.onAiConfigChange && inputApiKey) {
      this.onAiConfigChange({
        enabled: toggleAi ? toggleAi.checked : false,
        apiKey: inputApiKey.value,
        persona: inputPersona ? inputPersona.value : '',
        topics: inputTopics ? inputTopics.value : '',
        style: selectStyle ? selectStyle.value : 'Friendly',
        productContext: inputProductContext ? inputProductContext.value : ''
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
        voice: toggleVoice ? toggleVoice.checked : false,
        productContext: inputProductContext ? inputProductContext.value : ''
      });
    }
  }

  destroy() {
    if (this.container) this.container.remove();
  }
}
