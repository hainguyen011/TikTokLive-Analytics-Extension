export const APP_CONFIG = {
  NAME: 'TikTok Live Insight',
  VERSION: '1.0.0',
  UPDATE_INTERVAL: 1000,
  BATCH_SIZE: 50,
  FLUSH_INTERVAL: 5000
};

export const STORAGE_KEYS = {
  SETTINGS: 'tli_settings',
  SESSIONS: 'tli_sessions',
  ACTIVE_SESSION: 'tli_active_session'
};

export const EVENT_TYPES = {
  COMMENT: 'comment',
  VIEWER_UPDATE: 'viewer_update',
  ENGAGEMENT: 'engagement',
  PRODUCT_PIN: 'product_pin',
  GIFT: 'gift'
};

export const INTENT_TYPES = {
  QUESTION: 'question',
  PRICE_INQUIRY: 'price_inquiry',
  SPAM: 'spam',
  PRODUCT_INTEREST: 'product_interest'
};
