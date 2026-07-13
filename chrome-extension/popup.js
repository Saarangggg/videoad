document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-extension');
  const statusDesc = document.getElementById('extension-status-desc');
  const downloadsContainer = document.getElementById('downloads-container');
  const emptyState = document.getElementById('empty-state');

  const mainContent = document.getElementById('main-content');
  const offlinePanel = document.getElementById('offline-panel');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsBtn = document.getElementById('settings-btn');
  const startServerBtn = document.getElementById('start-server-btn');
  const backBtn = document.getElementById('back-btn');

  // Config checkboxes
  const detectVideo = document.getElementById('detect-video');
  const detectAudio = document.getElementById('detect-audio');
  const detectImage = document.getElementById('detect-image');
  const detectLink = document.getElementById('detect-link');
  const detectPage = document.getElementById('detect-page');
  const optionsGroup = document.getElementById('options-group');

  let isSettingsOpen = false;

  // Load active state & settings
  chrome.storage.local.get([
    'active', 'detectVideo', 'detectAudio', 'detectImage', 'detectLink', 'detectPage'
  ], (data) => {
    if (toggle) {
      toggle.checked = !!data.active;
      updateExtensionStatusText(toggle.checked);
      toggleOptionsGroup(toggle.checked);
    }
    if (detectVideo) detectVideo.checked = data.detectVideo !== false;
    if (detectAudio) detectAudio.checked = data.detectAudio !== false;
    if (detectImage) detectImage.checked = data.detectImage !== false;
    if (detectLink) detectLink.checked = data.detectLink !== false;
    if (detectPage) detectPage.checked = data.detectPage !== false;
  });

  // Toggle options group opacity and user inputs based on global active state
  function toggleOptionsGroup(isActive) {
    if (optionsGroup) {
      if (isActive) {
        optionsGroup.classList.remove('disabled');
      } else {
        optionsGroup.classList.add('disabled');
      }
      const inputs = optionsGroup.querySelectorAll('input[type="checkbox"]');
      inputs.forEach(input => {
        input.disabled = !isActive;
      });
    }
  }

  // Toggle state change
  if (toggle) {
    toggle.addEventListener('change', () => {
      const active = toggle.checked;
      chrome.storage.local.set({ active }, () => {
        updateExtensionStatusText(active);
        toggleOptionsGroup(active);
        chrome.runtime.sendMessage({ action: 'toggleActive', active });
      });
    });
  }

  function updateExtensionStatusText(isActive) {
    if (statusDesc) {
      statusDesc.textContent = isActive ? 'Active — context menu enabled' : 'Inactive — click to start';
    }
  }

  // Save detailed context configurations
  function saveOptions() {
    const settings = {
      detectVideo: detectVideo ? detectVideo.checked : true,
      detectAudio: detectAudio ? detectAudio.checked : true,
      detectImage: detectImage ? detectImage.checked : true,
      detectLink: detectLink ? detectLink.checked : true,
      detectPage: detectPage ? detectPage.checked : true
    };
    chrome.storage.local.set(settings, () => {
      chrome.runtime.sendMessage({ action: 'refreshContextMenus' });
    });
  }

  // Attach change listeners to detection options
  [detectVideo, detectAudio, detectImage, detectLink, detectPage].forEach(cb => {
    if (cb) cb.addEventListener('change', saveOptions);
  });

  // Toggling actions
  function showMainView() {
    isSettingsOpen = false;
    if (settingsPanel) settingsPanel.style.display = 'none';
    checkServer();
  }

  function showSettingsView() {
    isSettingsOpen = true;
    if (mainContent) mainContent.style.display = 'none';
    if (offlinePanel) offlinePanel.style.display = 'none';
    if (settingsPanel) settingsPanel.style.display = 'block';
  }

  // Settings Cog Click
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (isSettingsOpen) {
        showMainView();
      } else {
        showSettingsView();
      }
    });
  }

  // Back Button Click
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showMainView();
    });
  }

  // Start Server Button Action (triggers registry custom protocol videoad:// start)
  if (startServerBtn) {
    startServerBtn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'videoad://start';
      document.body.appendChild(iframe);
      setTimeout(() => {
        iframe.remove();
      }, 1000);
    });
  }

  // Check server connection
  async function checkServer() {
    if (isSettingsOpen) return;
    try {
      const response = await fetch('http://localhost:48774/', { method: 'HEAD', cache: 'no-store' });
      if (mainContent) mainContent.style.display = 'block';
      if (offlinePanel) offlinePanel.style.display = 'none';
      if (settingsPanel) settingsPanel.style.display = 'none';
    } catch (err) {
      if (mainContent) mainContent.style.display = 'none';
      if (offlinePanel) offlinePanel.style.display = 'block';
      if (settingsPanel) settingsPanel.style.display = 'none';
    }
  }

  checkServer();
  const serverInterval = setInterval(checkServer, 2000);

  // Load active downloads
  function requestDownloads() {
    chrome.runtime.sendMessage({ action: 'getActiveDownloads' }, (response) => {
      if (response && response.downloads) {
        updateDownloadsList(response.downloads);
      }
    });
  }

  // Initial load
  requestDownloads();
  detectActiveTabMedia();

  // Listen for progress messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'downloadProgressUpdate') {
      requestDownloads();
    }
  });

  function updateDownloadsList(downloads) {
    if (!downloads || downloads.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (downloadsContainer) {
        const items = downloadsContainer.querySelectorAll('.download-item');
        items.forEach(el => el.remove());
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    
    // Create/update cards
    if (downloadsContainer) {
      downloads.forEach(dl => {
        let card = document.getElementById(`dl-${dl.id}`);
        if (!card) {
          card = document.createElement('div');
          card.id = `dl-${dl.id}`;
          card.className = 'download-item';
          downloadsContainer.appendChild(card);
        }

        const progress = Math.min(Math.max(Math.round(dl.progress || 0), 0), 100);
        let statusLabel = dl.status;
        if (dl.status === 'downloading') statusLabel = `Downloading (${progress}%)`;
        else if (dl.status === 'merging') statusLabel = 'Merging streams...';
        else if (dl.status === 'extracting') statusLabel = 'Converting to MP3...';
        else if (dl.status === 'completed') statusLabel = 'Completed';
        else if (dl.status === 'failed') statusLabel = 'Failed';

        card.innerHTML = `
          <div class="dl-header">
            <span class="dl-title" title="${dl.title}">${dl.title}</span>
            <span class="dl-status">${statusLabel}</span>
          </div>
          <div class="dl-progress-bar">
            <div class="dl-progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="dl-meta">
            <span>Speed: ${dl.speed || '0 KB/s'}</span>
            <span>ETA: ${dl.eta || '--:--'}</span>
          </div>
        `;
      });

      // Remove any card that is no longer in active downloads list
      const currentCards = downloadsContainer.querySelectorAll('.download-item');
      currentCards.forEach(card => {
        const id = card.id.replace('dl-', '');
        if (!downloads.find(dl => dl.id === id)) {
          card.remove();
        }
      });
    }
  }

  // Detect active tab media URL
  function detectActiveTabMedia() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tab = tabs[0];
        const url = tab.url;
        const title = tab.title;

        // Verify if it's a web page, and not our own local config server
        const isWebPage = url.startsWith('http://') || url.startsWith('https://');
        const isSelfPage = url.includes('localhost:48774') || url.includes('127.0.0.1:48774');

        if (isWebPage && !isSelfPage) {
          const detectCard = document.getElementById('detect-card');
          const detectTitle = document.getElementById('detect-title');
          
          if (detectTitle) detectTitle.textContent = title;
          if (detectCard) detectCard.style.display = 'block';

          const downloadVideoBtn = document.getElementById('detect-download-video');
          const downloadAudioBtn = document.getElementById('detect-download-audio');

          // Bind download triggers
          if (downloadVideoBtn && !downloadVideoBtn.dataset.bound) {
            downloadVideoBtn.dataset.bound = 'true';
            downloadVideoBtn.addEventListener('click', () => {
              chrome.runtime.sendMessage({
                action: 'triggerDownload',
                url: url,
                title: title,
                type: 'video'
              });
              // Visual feedback
              downloadVideoBtn.textContent = 'Triggered!';
              downloadVideoBtn.disabled = true;
              setTimeout(() => {
                downloadVideoBtn.textContent = 'Download Video';
                downloadVideoBtn.disabled = false;
              }, 2000);
            });
          }

          if (downloadAudioBtn && !downloadAudioBtn.dataset.bound) {
            downloadAudioBtn.dataset.bound = 'true';
            downloadAudioBtn.addEventListener('click', () => {
              chrome.runtime.sendMessage({
                action: 'triggerDownload',
                url: url,
                title: title,
                type: 'audio'
              });
              // Visual feedback
              downloadAudioBtn.textContent = 'Triggered!';
              downloadAudioBtn.disabled = true;
              setTimeout(() => {
                downloadAudioBtn.textContent = 'Download Audio';
                downloadAudioBtn.disabled = false;
              }, 2000);
            });
          }
        } else {
          const detectCard = document.getElementById('detect-card');
          if (detectCard) detectCard.style.display = 'none';
        }
      }
    });
  }

  // ---- Instagram Cookie Connect ----
  const igDot = document.getElementById('ig-dot');
  const igStatusText = document.getElementById('ig-status-text');
  const igConnectBtn = document.getElementById('ig-connect-btn');

  async function checkInstagramCookieStatus() {
    try {
      const res = await fetch('http://localhost:48774/api/instagram-cookie-status');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          if (igDot) { igDot.className = 'ig-dot connected'; }
          if (igStatusText) igStatusText.textContent = `Connected (${data.cookieCount} cookies)`;
          if (igConnectBtn) igConnectBtn.textContent = 'Refresh';
        } else {
          if (igDot) { igDot.className = 'ig-dot disconnected'; }
          if (igStatusText) igStatusText.textContent = 'Not connected';
          if (igConnectBtn) igConnectBtn.textContent = 'Connect';
        }
      }
    } catch (e) {
      if (igStatusText) igStatusText.textContent = 'Server offline';
    }
  }

  if (igConnectBtn) {
    igConnectBtn.addEventListener('click', async () => {
      igConnectBtn.disabled = true;
      igConnectBtn.textContent = 'Reading cookies...';
      try {
        // Gather all Instagram cookies from Chrome
        const cookies = await new Promise((resolve) => {
          chrome.cookies.getAll({ domain: 'instagram.com' }, resolve);
        });
        if (!cookies || cookies.length === 0) {
          if (igStatusText) igStatusText.textContent = 'No Instagram cookies found. Please log in to Instagram in Chrome first.';
          if (igDot) { igDot.className = 'ig-dot disconnected'; }
          igConnectBtn.disabled = false;
          igConnectBtn.textContent = 'Connect';
          return;
        }
        // Send to server
        const res = await fetch('http://localhost:48774/api/save-cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookies })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (igDot) { igDot.className = 'ig-dot connected'; }
          if (igStatusText) igStatusText.textContent = `Connected (${data.count} cookies)`;
          igConnectBtn.textContent = 'Refresh';
        } else {
          if (igStatusText) igStatusText.textContent = 'Failed to save cookies';
          if (igDot) { igDot.className = 'ig-dot disconnected'; }
          igConnectBtn.textContent = 'Retry';
        }
      } catch (e) {
        if (igStatusText) igStatusText.textContent = 'Error: ' + e.message;
        igConnectBtn.textContent = 'Retry';
      }
      igConnectBtn.disabled = false;
    });
  }

  // Check status when settings panel is opened
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      checkInstagramCookieStatus();
    });
  }

  // Cleanup interval on unload
  window.addEventListener('unload', () => {
    clearInterval(serverInterval);
  });
});
