(function() {
  // Avoid injecting inside iframes
  if (window.self !== window.top) return;

  // Never run on the local downloader page
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

  let lastShownUrl = '';
  let pendingUrl = '';
  let pendingTimeout = null;
  let mediaInterval = null;
  let contextInvalid = false;

  function isContextValid() {
    try {
      // Accessing chrome.runtime.id throws if the extension context is invalidated
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function stopPolling() {
    contextInvalid = true;
    if (mediaInterval) {
      clearInterval(mediaInterval);
      mediaInterval = null;
    }
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    const existing = document.getElementById('videoad-onscreen-toast');
    if (existing) existing.remove();
  }

  function checkForMedia() {
    if (contextInvalid) return;

    // Hard guard: stop everything if context is gone
    if (!isContextValid()) {
      stopPolling();
      return;
    }

    try {
      chrome.storage.local.get(['active', 'detectVideo', 'detectAudio'], (result) => {
        // Guard inside async callback too
        if (!isContextValid()) {
          stopPolling();
          return;
        }

        if (chrome.runtime.lastError) {
          stopPolling();
          return;
        }

        // Only run if the helper is globally enabled
        const isActive = result.active !== false;
        if (!isActive) {
          const existing = document.getElementById('videoad-onscreen-toast');
          if (existing) existing.remove();
          return;
        }

        const video = document.querySelector('video');
        const audio = document.querySelector('audio');
        const currentUrl = window.location.href;

        const hasVideo = video && (video.src || video.querySelector('source'));
        const hasAudio = audio && (audio.src || audio.querySelector('source'));

        // Support YouTube, Instagram, and pages with embedded media
        const isMediaPage = currentUrl.includes('youtube.com/watch') ||
                            currentUrl.includes('instagram.com') ||
                            hasVideo ||
                            hasAudio;

        if (isMediaPage) {
          if (currentUrl !== lastShownUrl && currentUrl !== pendingUrl) {
            pendingUrl = currentUrl;
            if (pendingTimeout) clearTimeout(pendingTimeout);

            // Wait 2 seconds for SPA navigation to finish updating title
            pendingTimeout = setTimeout(() => {
              if (!isContextValid()) {
                stopPolling();
                return;
              }
              if (window.location.href === pendingUrl) {
                let cleanTitle = document.title || 'Detected Media';
                cleanTitle = cleanTitle.replace(/^\(\d+\)\s+/, '');
                cleanTitle = cleanTitle.replace(/\s*-\s*YouTube$/, '');
                showOnScreenToast(cleanTitle, pendingUrl);
                lastShownUrl = pendingUrl;
              }
              pendingUrl = '';
            }, 2000);
          }
        } else {
          const existing = document.getElementById('videoad-onscreen-toast');
          if (existing) existing.remove();
          lastShownUrl = '';
          pendingUrl = '';
        }
      });
    } catch (e) {
      // Any synchronous throw means context is dead
      stopPolling();
    }
  }

  function showOnScreenToast(title, url) {
    const existing = document.getElementById('videoad-onscreen-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'videoad-onscreen-toast';
    toast.innerHTML = `
      <div class="va-toast-header">
        <span class="va-toast-pulse"></span>
        <span class="va-toast-header-title">Media Detected</span>
        <button class="va-toast-close" id="va-toast-close">&times;</button>
      </div>
      <div class="va-toast-body">
        <div class="va-toast-title" id="va-toast-title"></div>
        <div class="va-toast-actions">
          <button class="va-toast-btn download-video" id="va-toast-video">⬇ Video</button>
          <button class="va-toast-btn download-audio" id="va-toast-audio">🎵 Audio</button>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    const titleEl = document.getElementById('va-toast-title');
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.title = title;
    }

    document.getElementById('va-toast-close').addEventListener('click', () => {
      toast.remove();
    });

    const triggerBgDownload = (type, btn) => {
      if (!isContextValid()) {
        stopPolling();
        return;
      }
      try {
        chrome.runtime.sendMessage({
          action: 'triggerDownload',
          url: url,
          title: title,
          type: type
        });
        btn.textContent = 'Triggered!';
        btn.disabled = true;
        setTimeout(() => toast.remove(), 1500);
      } catch (e) {
        stopPolling();
      }
    };

    const videoBtn = document.getElementById('va-toast-video');
    if (videoBtn) {
      videoBtn.addEventListener('click', () => triggerBgDownload('video', videoBtn));
    }

    const audioBtn = document.getElementById('va-toast-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => triggerBgDownload('audio', audioBtn));
    }

    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (document.getElementById('videoad-onscreen-toast') === toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 8000);
  }

  // Start polling
  mediaInterval = setInterval(checkForMedia, 3000);
  checkForMedia();
})();
