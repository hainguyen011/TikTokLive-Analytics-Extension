(async () => {
  try {
    const src = chrome.runtime.getURL('src/content/content.js');
    await import(src);
  } catch (error) {
    console.error('[TLI] Failed to load content script:', error);
  }
})();
