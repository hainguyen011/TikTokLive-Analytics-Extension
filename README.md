# TikTok Live Insight - Chrome Extension

## 📊 Overview

**TikTok Live Insight** is a Chrome Extension that provides real-time analytics and AI-powered insights for TikTok livestream hosts and moderators. It analyzes comments, tracks viewer engagement, and delivers actionable recommendations during live sessions.

## ✨ Key Features

### MVP (Phase 1)
- ✅ **Real-time Comment Monitoring** - Track and analyze comments as they appear
- ✅ **Intent Detection** - Identify price inquiries, questions, and spam using rule-based analysis
- ✅ **Live Metrics Dashboard** - View viewer count, comment rate, and engagement metrics
- ✅ **Floating UI** - Non-intrusive overlay that doesn't block livestream content
- ✅ **Smart Alerts** - Get notified of viewer drops, comment spikes, and high-priority comments
- ✅ **Post-Live Summary** - Export session analytics as JSON

### Phase 2 (AI Enhancement)
- 🤖 **LLM-Powered Analysis** - Advanced sentiment analysis and intent classification
- 💬 **Suggested Responses** - AI-generated response suggestions for hosts
- 📈 **Predictive Insights** - Viewer retention and engagement optimization tips
- 🌐 **Multi-Language Support** - Vietnamese, English, Thai, Indonesian

### Phase 3 (SaaS Platform)
- 📊 **Historical Analytics** - Track performance across multiple sessions
- 👥 **Team Collaboration** - Multi-user support for hosts and moderators
- 🔗 **Integrations** - CRM, e-commerce platforms, social media
- 📄 **Advanced Reporting** - PDF/Excel exports, custom dashboards

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TikTok Live Page                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Content Script (DOM Observer)                     │ │
│  │  • Extract comments, metrics, product info         │ │
│  │  • Rule-based analysis (intent, sentiment)         │ │
│  │  • Inject floating dashboard                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         Background Service Worker                        │
│  • Event batching & aggregation                         │
│  • Backend API communication (optional)                 │
│  • WebSocket management                                 │
│  • Alert notifications                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Backend Services (Optional)                 │
│  • AI/LLM inference (Gemini API)                        │
│  • Stream processing                                    │
│  • Analytics database                                   │
│  • Enhanced insights delivery                           │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
TikTokLive-Analytics-Extension/
├── manifest.json                 # Extension manifest (Manifest V3)
├── README.md                     # This file
├── ARCHITECTURE.md               # Detailed technical documentation
│
├── icons/                        # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon-512.png
│
├── src/
│   ├── content/                  # Content scripts (injected into TikTok pages)
│   │   ├── content.js            # Main content script
│   │   ├── dom-observer.js       # MutationObserver for DOM changes
│   │   ├── data-extractor.js     # Extract comments, metrics, products
│   │   └── content.css           # Injected styles
│   │
│   ├── background/               # Background service worker
│   │   ├── background.js         # Main service worker
│   │   ├── event-batcher.js      # Batch events for backend
│   │   ├── api-client.js         # Backend API client
│   │   └── websocket-manager.js  # WebSocket for real-time updates
│   │
│   ├── dashboard/                # Floating dashboard UI
│   │   ├── dashboard.html        # Dashboard template
│   │   ├── dashboard.js          # Dashboard logic
│   │   ├── dashboard.css         # Dashboard styles
│   │   └── components/           # UI components
│   │       ├── metrics-panel.js
│   │       ├── comments-panel.js
│   │       ├── alerts-panel.js
│   │       └── chart-renderer.js
│   │
│   ├── popup/                    # Extension popup (settings)
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   │
│   ├── analysis/                 # Analysis engines
│   │   ├── rule-engine.js        # Rule-based intent detection
│   │   ├── sentiment-analyzer.js # Lightweight sentiment analysis
│   │   ├── anomaly-detector.js   # Viewer/engagement anomaly detection
│   │   └── pattern-matcher.js    # Pattern matching utilities
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── storage.js            # Chrome storage wrapper
│   │   ├── logger.js             # Logging utility
│   │   ├── constants.js          # Constants and config
│   │   └── helpers.js            # Helper functions
│   │
│   └── libs/                     # Third-party libraries
│       ├── chart.min.js          # Chart.js (lightweight)
│       └── date-fns.min.js       # Date utilities
│
├── config/
│   ├── selectors.json            # TikTok DOM selectors
│   ├── intent-rules.json         # Intent detection rules
│   └── sentiment-lexicon.json    # Sentiment keywords
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## 🚀 Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tiktok-live-insight.git
   cd tiktok-live-insight
   ```

2. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `TikTokLive-Analytics-Extension` folder

3. **Test on TikTok Live**
   - Go to any TikTok live stream (e.g., `https://www.tiktok.com/@username/live`)
   - The floating dashboard should appear automatically

### For Users (Chrome Web Store)

_Coming soon - Extension will be available on Chrome Web Store_

## 🎯 Usage

### Basic Workflow

1. **Start a TikTok Livestream** or **visit an active livestream**
2. **Dashboard appears automatically** in the top-right corner
3. **View real-time metrics**:
   - Current viewer count with trend
   - Comments per minute
   - Engagement rate
4. **Monitor hot comments** with AI-suggested responses
5. **Receive alerts** for important events:
   - Price inquiries
   - Viewer drops
   - Comment spikes
6. **Export session data** after the livestream ends

### Dashboard Controls

- **Drag** - Click and drag the header to reposition
- **Minimize** - Click the `−` button to collapse
- **Close** - Click the `×` button to hide
- **Tabs** - Switch between Metrics, Comments, and Alerts

### Settings (Popup)

Click the extension icon in Chrome toolbar to access:
- Enable/disable features
- Configure API key (for AI features)
- Set alert thresholds
- View session history

## 🔧 Configuration

### DOM Selectors (`config/selectors.json`)

TikTok's DOM structure may change. Update selectors here:

```json
{
  "comment": {
    "container": "[data-e2e='comment-item']",
    "username": ".username",
    "text": ".comment-text",
    "timestamp": ".timestamp"
  },
  "metrics": {
    "viewers": "[data-e2e='viewer-count']",
    "likes": "[data-e2e='like-count']",
    "shares": "[data-e2e='share-count']"
  }
}
```

### Intent Rules (`config/intent-rules.json`)

Customize intent detection keywords:

```json
{
  "priceInquiry": {
    "keywords": ["giá", "bao nhiêu", "price", "얼마"],
    "priority": "high"
  },
  "spam": {
    "keywords": ["follow me", "check bio"],
    "priority": "low"
  }
}
```

## 🤖 AI Integration (Optional)

### Backend API Setup

1. **Deploy backend** (Node.js/Python/Go)
2. **Configure API endpoint** in extension settings
3. **Add API key** for authentication
4. **Enable AI features** in popup

### API Endpoints

```
POST /api/events/batch
- Batch upload livestream events

POST /api/analyze/comments
- Get AI-powered comment analysis

GET /api/insights/:sessionId
- Retrieve enhanced insights
```

### LLM Integration (Gemini API)

```javascript
// Example: Analyze comments with Gemini
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze these TikTok comments and suggest responses: ${comments}`
        }]
      }]
    })
  }
);
```

## 📊 Data Schema

### Comment Event
```typescript
{
  type: 'comment',
  timestamp: 1703750400000,
  sessionId: 'session_123',
  data: {
    id: 'c_456',
    username: 'user123',
    text: 'Giá bao nhiêu vậy shop?',
    intent: 'price_inquiry',
    sentiment: 0.0,
    priority: 'high'
  }
}
```

### Viewer Event
```typescript
{
  type: 'viewer_update',
  timestamp: 1703750400000,
  sessionId: 'session_123',
  data: {
    count: 1234,
    delta: -50,
    trend: 'falling'
  }
}
```

## 🛡️ Privacy & Security

- **Client-side first**: All analysis happens in browser by default
- **No data collection**: Extension doesn't send data unless user enables backend
- **Minimal permissions**: Only requests necessary Chrome APIs
- **CSP compliant**: No inline scripts or eval()
- **GDPR ready**: User controls all data with deletion options

### Permissions Required

```json
{
  "permissions": [
    "activeTab",        // Access current tab
    "storage",          // Local storage
    "notifications"     // Browser notifications
  ],
  "host_permissions": [
    "https://*.tiktok.com/*"  // Only TikTok domains
  ]
}
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Extension loads on TikTok Live page
- [ ] Dashboard appears and is draggable
- [ ] Comments are extracted correctly
- [ ] Metrics update in real-time
- [ ] Alerts trigger appropriately
- [ ] Export functionality works
- [ ] Settings persist across sessions

## 🐛 Troubleshooting

### Dashboard not appearing
- Check if you're on a TikTok Live page
- Refresh the page
- Check browser console for errors

### Comments not detected
- TikTok may have changed their DOM structure
- Update selectors in `config/selectors.json`
- Report issue on GitHub

### High CPU usage
- Disable charts in settings
- Reduce analysis frequency
- Clear old session data

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- TikTok for the platform
- Chart.js for visualization
- Google Gemini for AI capabilities
- Chrome Extensions community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tiktok-live-insight/issues)
- **Email**: support@tiktok-live-insight.com
- **Discord**: [Join our community](https://discord.gg/tiktok-live-insight)

## 🗺️ Roadmap

- [x] MVP with basic analytics
- [ ] AI-powered suggestions
- [ ] Multi-platform support (Facebook, YouTube)
- [ ] Mobile app for hosts
- [ ] SaaS dashboard
- [ ] Team collaboration features

---

**Made with ❤️ for TikTok Creators**
