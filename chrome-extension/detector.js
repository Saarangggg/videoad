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
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  function stopPolling() {
    contextInvalid = true;
    if (mediaInterval) { clearInterval(mediaInterval); mediaInterval = null; }
    if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
    const existing = document.getElementById('videoad-onscreen-toast');
    if (existing) existing.remove();
  }

  function detectMediaTypes() {
    const currentUrl = window.location.href;
    const hostname = window.location.hostname.toLowerCase();

    // Explicit checks for main platforms to avoid triggering on profiles/feeds
    if (hostname.includes('instagram.com')) {
      const isReel = currentUrl.includes('/reel/') || currentUrl.includes('/reels/');
      const isPost = currentUrl.includes('/p/');
      if (!isReel && !isPost) {
        return { hasVideo: false, hasAudio: false, hasImage: false, isMediaPage: false };
      }
    }

    if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) {
      const isPin = currentUrl.includes('/pin/') || currentUrl.includes('/pins/');
      if (!isPin) {
        return { hasVideo: false, hasAudio: false, hasImage: false, isMediaPage: false };
      }
    }

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const isWatch = currentUrl.includes('/watch') || currentUrl.includes('/shorts') || currentUrl.includes('/v/');
      if (!isWatch) {
        return { hasVideo: false, hasAudio: false, hasImage: false, isMediaPage: false };
      }
    }

    const video = document.querySelector('video');
    const audio = document.querySelector('audio');

    const hasVideo = !!(video && (video.src || video.querySelector('source')));
    const hasAudio = !!(audio && (audio.src || audio.querySelector('source')));

    // Image detection: Instagram image posts (/p/), or direct image URLs
    const isInstagramImagePost = currentUrl.includes('instagram.com/p/');
    const isDirectImageUrl = /\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(currentUrl);
    // Also detect pages with prominent <img> tags (e.g. image viewer pages)
    const hasLargeImage = !hasVideo && (() => {
      // Don't run generic large image detection on social home/profile feeds
      if (hostname.includes('instagram.com') || hostname.includes('facebook.com') || hostname.includes('twitter.com') || hostname.includes('x.com') || hostname.includes('youtube.com') || hostname.includes('pinterest.com')) {
        return false;
      }
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.some(img => img.naturalWidth > 400 && img.naturalHeight > 300);
    })();
    const hasImage = isInstagramImagePost || isDirectImageUrl || hasLargeImage;

    // Platform checks
    const isYouTubeVideo = currentUrl.includes('youtube.com/watch');
    const isInstagramReel = currentUrl.includes('instagram.com/reel') || currentUrl.includes('instagram.com/reels');

    const isMediaPage = isYouTubeVideo || isInstagramReel || hasVideo || hasAudio || hasImage;

    return { hasVideo, hasAudio, hasImage, isMediaPage };
  }

  function checkForMedia() {
    if (contextInvalid) return;

    if (!isContextValid()) {
      stopPolling();
      return;
    }

    try {
      chrome.storage.local.get(['active', 'detectVideo', 'detectAudio'], (result) => {
        if (!isContextValid()) { stopPolling(); return; }
        if (chrome.runtime.lastError) { stopPolling(); return; }

        const isActive = result.active !== false;
        if (!isActive) {
          const existing = document.getElementById('videoad-onscreen-toast');
          if (existing) existing.remove();
          return;
        }

        const currentUrl = window.location.href;
        const { hasVideo, hasAudio, hasImage, isMediaPage } = detectMediaTypes();

        if (isMediaPage) {
          if (currentUrl !== lastShownUrl && currentUrl !== pendingUrl) {
            pendingUrl = currentUrl;
            if (pendingTimeout) clearTimeout(pendingTimeout);

            // Wait 2 seconds for SPA navigation to settle and update title
            pendingTimeout = setTimeout(() => {
              if (!isContextValid()) { stopPolling(); return; }
              if (window.location.href === pendingUrl) {
                const { hasVideo: v, hasAudio: a, hasImage: img } = detectMediaTypes();
                let cleanTitle = document.title || 'Detected Media';
                cleanTitle = cleanTitle.replace(/^\(\d+\)\s+/, '');
                cleanTitle = cleanTitle.replace(/\s*-\s*YouTube$/, '');
                showOnScreenToast(cleanTitle, pendingUrl, v, a, img);
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
      stopPolling();
    }
  }

  function showOnScreenToast(title, url, hasVideo, hasAudio, hasImage) {
    const existing = document.getElementById('videoad-onscreen-toast');
    if (existing) existing.remove();

    // Build action buttons dynamically based on what's detected
    let buttons = '';
    if (hasVideo) {
      buttons += `<button class="va-toast-btn download-video" id="va-toast-video">⬇ Video</button>`;
    }
    if (hasAudio || hasVideo) {
      buttons += `<button class="va-toast-btn download-audio" id="va-toast-audio">🎵 Audio</button>`;
    }
    if (hasImage && !hasVideo) {
      buttons += `<button class="va-toast-btn download-image" id="va-toast-image">🖼 Image</button>`;
    }
    // Fallback: if we couldn't detect specifics, show video + audio
    if (!buttons) {
      buttons = `<button class="va-toast-btn download-video" id="va-toast-video">⬇ Video</button>
                 <button class="va-toast-btn download-audio" id="va-toast-audio">🎵 Audio</button>`;
    }

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
        <div class="va-toast-actions">${buttons}</div>
      </div>
    `;

    document.body.appendChild(toast);

    const titleEl = document.getElementById('va-toast-title');
    if (titleEl) { titleEl.textContent = title; titleEl.title = title; }

    document.getElementById('va-toast-close').addEventListener('click', () => toast.remove());

    const triggerBgDownload = (type, btn) => {
      if (!isContextValid()) { stopPolling(); return; }
      try {
        chrome.runtime.sendMessage({ action: 'triggerDownload', url, title, type });
        btn.textContent = 'Triggered!';
        btn.disabled = true;
        setTimeout(() => toast.remove(), 1500);
      } catch (e) {
        stopPolling();
      }
    };

    const videoBtn = document.getElementById('va-toast-video');
    if (videoBtn) videoBtn.addEventListener('click', () => triggerBgDownload('video', videoBtn));

    const audioBtn = document.getElementById('va-toast-audio');
    if (audioBtn) audioBtn.addEventListener('click', () => triggerBgDownload('audio', audioBtn));

    const imageBtn = document.getElementById('va-toast-image');
    if (imageBtn) imageBtn.addEventListener('click', () => triggerBgDownload('image', imageBtn));

    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (document.getElementById('videoad-onscreen-toast') === toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 8000);
  }

  const adSelectors = [
    // General ad iframe networks
    'iframe[src*="doubleclick"]',
    'iframe[src*="googleads"]',
    'iframe[id^="google_ads"]',
    'iframe[id^="google_ads_iframe"]',
    '.adsbygoogle',
    'a[href*="googleadservices.com"]',
    // Class/ID attributes containing standard ad keywords (case-insensitive)
    '[class*="sponsored" i]',
    '[id*="sponsored" i]',
    '[class*="ad-unit" i]',
    '[id*="ad-unit" i]',
    '[class*="ad-container" i]',
    '[id*="ad-container" i]',
    '[class*="advertisement" i]',
    '[id*="advertisement" i]',
    // YouTube Specific Promo/Ad Nodes
    'ytd-ad-slot-renderer',
    'ytd-companion-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    '.ytd-promoted-video-renderer',
    '#player-ads',
    '#masthead-ad',
    '.style-scope.ytd-ad-slot-renderer',
    // Popunder and Redirect Banners
    'div[class*="popunder" i]',
    'div[id*="popunder" i]',
    'a[href*="onclickads.net"]',
    'div[class*="ad-box" i]',
    'div[id*="ad-box" i]'
  ];

  const protectSelector = '#masthead-container, ytd-masthead, #masthead, ytmusic-nav-bar, #header, header, .nav-bar, #movie_player, .html5-video-container, .ytmusic-player-bar, #ytp-control-bar, .ytp-chrome-bottom';

  function removeDisplayAds() {
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // Protect main site navigation headers, brand logos, search bars, and video players
        if (el.matches(protectSelector) || el.closest(protectSelector)) {
          return;
        }
        el.remove();
      });
    });
  }

  function skipYouTubeAds() {
    if (!window.location.hostname.includes('youtube.com')) return;

    const mediaElements = document.querySelectorAll('video, audio');
    const adShowing = 
      document.querySelector('.ad-showing') || 
      document.querySelector('.ad-interrupting') ||
      document.querySelector('ytmusic-player-bar[class*="ad"]') ||
      document.querySelector('.ytp-ad-player-overlay') ||
      document.querySelector('.ytmusic-ad-badge') ||
      document.querySelector('.ytp-ad-badge');

    const skipButton = 
      document.querySelector('.ytp-ad-skip-button') || 
      document.querySelector('.ytp-ad-skip-button-modern') ||
      document.querySelector('.ytmusic-ad-skip-button');

    if (adShowing && mediaElements.length > 0) {
      mediaElements.forEach(media => {
        media.muted = true;
        media.playbackRate = 16;
        if (isFinite(media.duration) && media.currentTime < media.duration - 0.1) {
          media.currentTime = media.duration - 0.1;
        }
      });
    }

    if (skipButton) {
      skipButton.click();
    }

    const overlays = document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-image-overlay, #masthead-ad, ytd-companion-ad-renderer, .ytd-merch-shelf-renderer');
    overlays.forEach(el => {
      el.style.display = 'none';
    });
  }

  function skipInstagramAds() {
    if (!window.location.hostname.includes('instagram.com')) return;

    // 1. Stories Ad Skip (Active leaf-node detection) - ONLY RUN IF ACTIVE STORY VIEW IS OPEN
    if (window.location.pathname.includes('/stories/')) {
      let isAdActive = false;
      const leafNodes = document.querySelectorAll('div, span, a');
      for (const el of leafNodes) {
        if (el.children.length === 0) { // Leaf node
          const txt = el.textContent.trim();
          if (txt === 'Ad' || txt === 'Sponsored') {
            // Check if it is inside the story player container
            if (el.closest('section, div[class*="story" i], div[class*="player" i], [role="dialog"]')) {
              isAdActive = true;
              break;
            }
          }
        }
      }

      if (isAdActive) {
        const nextButton = 
          document.querySelector('button[aria-label="Next"]') ||
          document.querySelector('svg[aria-label="Next"]')?.closest('button') ||
          document.querySelector('svg[aria-label="Chevron right"]')?.closest('button') ||
          document.querySelector('button[class*="next" i]') ||
          document.querySelector('button[class*="right" i]') ||
          document.querySelector('div[class*="next" i] button') ||
          document.querySelector('div[class*="right" i] button') ||
          document.querySelector('.coreSpriteRightChevron');

        if (nextButton) {
          console.log("[VideoAd] Instagram story ad skipped");
          nextButton.click();
        }
      }
    }

    // 2. Feed Ad Hider
    const posts = document.querySelectorAll('article');
    posts.forEach(post => {
      const links = Array.from(post.querySelectorAll('a, span, div'));
      const isSponsored = links.some(el => {
        const txt = el.textContent.trim();
        return txt === 'Sponsored' || txt === 'Ad';
      });
      if (isSponsored) {
        post.style.display = 'none';
      }
    });
  }

  let adBlockInterval = null;
  let ytAdInterval = null;
  let instaAdInterval = null;

  function runAdBlocker() {
    if (contextInvalid) return;
    if (!isContextValid()) { stopPolling(); return; }

    chrome.storage.local.get(['adBlockActive'], (result) => {
      if (contextInvalid || !isContextValid()) return;
      const isAdBlockActive = result.adBlockActive !== false;
      
      document.documentElement.setAttribute('data-videoad-adblock', isAdBlockActive ? 'true' : 'false');

      if (isAdBlockActive) {
        if (!adBlockInterval) adBlockInterval = setInterval(removeDisplayAds, 1000);
        if (!ytAdInterval && window.location.hostname.includes('youtube.com')) {
          ytAdInterval = setInterval(skipYouTubeAds, 200);
        }
        if (!instaAdInterval && window.location.hostname.includes('instagram.com')) {
          instaAdInterval = setInterval(skipInstagramAds, 350);
        }
        removeDisplayAds();
        if (window.location.hostname.includes('youtube.com')) skipYouTubeAds();
        if (window.location.hostname.includes('instagram.com')) skipInstagramAds();
      } else {
        if (adBlockInterval) { clearInterval(adBlockInterval); adBlockInterval = null; }
        if (ytAdInterval) { clearInterval(ytAdInterval); ytAdInterval = null; }
        if (instaAdInterval) { clearInterval(instaAdInterval); instaAdInterval = null; }
      }
    });
  }

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'adBlockStateChanged') {
        runAdBlocker();
      }
    });
  } catch (e) {}

  mediaInterval = setInterval(checkForMedia, 3000);
  checkForMedia();
  runAdBlocker();
})();
