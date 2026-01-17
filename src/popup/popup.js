import { storage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

document.addEventListener('DOMContentLoaded', async () => {
  const dashboardToggle = document.getElementById('enable-dashboard');
  const alertsToggle = document.getElementById('enable-alerts');
  const aiToggle = document.getElementById('enable-ai');
  const exportBtn = document.getElementById('export-btn');
  const clearBtn = document.getElementById('clear-btn');

  // Load existing settings
  const settings = await storage.get(STORAGE_KEYS.SETTINGS) || {
    enableDashboard: true,
    enableAlerts: true,
    enableAI: false
  };

  dashboardToggle.checked = settings.enableDashboard;
  alertsToggle.checked = settings.enableAlerts;
  aiToggle.checked = settings.enableAI;

  // Save settings on change
  const saveSettings = async () => {
    await storage.set(STORAGE_KEYS.SETTINGS, {
      enableDashboard: dashboardToggle.checked,
      enableAlerts: alertsToggle.checked,
      enableAI: aiToggle.checked
    });
  };

  dashboardToggle.addEventListener('change', saveSettings);
  alertsToggle.addEventListener('change', saveSettings);
  aiToggle.addEventListener('change', saveSettings);

  exportBtn.addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['session_data']);
    const data = result.session_data || [];

    if (data.length === 0) {
      alert('Không tìm thấy dữ liệu phiên nào để xuất.');
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tli-session-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  });

  clearBtn.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu phiên không?')) {
      await chrome.storage.local.remove(['session_data']);
      alert('Đã xóa lịch sử.');
    }
  });
});
