// Listen for ping requests from the VideoAd web page
window.addEventListener('PingVideoAdExtension', () => {
  window.dispatchEvent(new CustomEvent('VideoAdExtensionLoaded'));
});

// Dispatch immediately in case the page has already loaded and registered its listener
window.dispatchEvent(new CustomEvent('VideoAdExtensionLoaded'));
