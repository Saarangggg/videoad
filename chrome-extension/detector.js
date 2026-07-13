(function() {
  // Avoid injecting inside iframes
  if (window.self !== window.top) return;

  let lastDetectedUrl = '';
  let mediaInterval = null;

  function checkForMedia() {
    // Check if the extension context is still valid
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local || !chrome.runtime || !chrome.runtime.id) {
      if (mediaInterval) {
        clearInterval(mediaInterval);
      }
      return;
    }

    try {
      chrome.storage.local.get(['active', 'detectVideo', 'detectAudio'], (result) => {
        // Handle runtime error (e.g. context invalidated)
        if (chrome.runtime.lastError) {
          if (mediaInterval) {
            clearInterval(mediaInterval);
          }
          return;
        }

        // Only run if the helper is globally enabled
        const isActive = result.active !== false;
        if (!isActive) {
          // If disabled, remove any existing toast
          const existing = document.getElementById('videoad-onscreen-toast');
          if (existing) existing.remove();
          return;
        }

        const video = document.querySelector('video');
        const audio = document.querySelector('audio');
        const currentUrl = window.location.href;

        const hasVideo = video && (video.src || video.querySelector('source'));
        const hasAudio = audio && (audio.src || audio.querySelector('source'));
        
        // Specifically support YouTube/Instagram/generic URLs
        const isMediaPage = currentUrl.includes('youtube.com/watch') || 
                            currentUrl.includes('instagram.com') || 
                            hasVideo || 
                            hasAudio;

        if (isMediaPage && currentUrl !== lastDetectedUrl) {
          // Avoid running on local web client page
          if (currentUrl.includes('localhost:48774') || currentUrl.includes('127.0.0.1:48774')) return;

          lastDetectedUrl = currentUrl;
          
          // Use clean title (strip trailing YouTube site names)
          let cleanTitle = document.title || 'Detected Media';
          cleanTitle = cleanTitle.replace(/^\(\d+\)\s+/, ''); // Remove notification counts like (1)
          cleanTitle = cleanTitle.replace(/\s*-\s*YouTube$/, '');

          showOnScreenToast(cleanTitle, currentUrl);
        }
      });
    } catch (e) {
      // Catch any unexpected context invalidation exception and halt polling
      if (mediaInterval) {
        clearInterval(mediaInterval);
      }
    }
  }

  function showOnScreenToast(title, url) {
    // Remove existing toast first to refresh contents
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
          <button class="va-toast-btn download-video" id="va-toast-video">Download Video</button>
          <button class="va-toast-btn download-audio" id="va-toast-audio">Download Audio</button>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Securely set title content to prevent HTML injection issues
    const titleEl = document.getElementById('va-toast-title');
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.title = title;
    }

    // Close button
    document.getElementById('va-toast-close').addEventListener('click', () => {
      toast.remove();
    });

    const triggerBgDownload = (type, btn) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          action: 'triggerDownload',
          url: url,
          title: title,
          type: type
        });
        btn.textContent = 'Triggered!';
        btn.disabled = true;
        setTimeout(() => {
          toast.remove();
        }, 1500);
      }
    };

    // Download Video click
    const videoBtn = document.getElementById('va-toast-video');
    if (videoBtn) {
      videoBtn.addEventListener('click', () => triggerBgDownload('video', videoBtn));
    }

    // Download Audio click
    const audioBtn = document.getElementById('va-toast-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => triggerBgDownload('audio', audioBtn));
    }

    // Automatically hide toast after 8 seconds
    setTimeout(() => {
      if (document.getElementById('videoad-onscreen-toast') === toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 8000);
  }

  // Poll DOM state changes
  mediaInterval = setInterval(checkForMedia, 3000);
  checkForMedia();
})();
