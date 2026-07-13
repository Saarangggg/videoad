document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const urlInput = document.getElementById('url-input');
  const clearBtn = document.getElementById('clear-btn');
  const fetchBtn = document.getElementById('fetch-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const errorBox = document.getElementById('error-box');
  const errorMessage = document.getElementById('error-message');
  
  const previewSection = document.getElementById('preview-section');
  const previewThumbnail = document.getElementById('preview-thumbnail');
  const previewBadge = document.getElementById('preview-badge');
  const previewDuration = document.getElementById('preview-duration');
  const previewTitle = document.getElementById('preview-title');
  const previewAuthor = document.getElementById('preview-author');
  const downloadBtn = document.getElementById('download-btn');
  
  const progressSection = document.getElementById('progress-section');
  const statusText = document.getElementById('status-text');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const speedText = document.getElementById('speed-text');
  const etaText = document.getElementById('eta-text');
  const consoleOutput = document.getElementById('console-output');
  const consoleToggleBtn = document.getElementById('console-toggle-btn');
  
  const historyEmpty = document.getElementById('history-empty');
  const historyList = document.getElementById('history-list');

  // --- State Variables ---
  let activeTab = 'video'; // 'video' | 'audio' | 'instagram' (determined by selected download format option)
  let activeMediaInfo = null;
  let sseSource = null;

  // --- Input handlers ---
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      clearBtn.style.display = 'block';
    } else {
      clearBtn.style.display = 'none';
    }
  });

  // Handle paste events to auto-detect and auto-fetch
  urlInput.addEventListener('paste', () => {
    setTimeout(() => {
      handleAutoDetectionAndFetch();
    }, 50);
  });

  function handleAutoDetectionAndFetch() {
    const url = urlInput.value.trim();
    if (!url) return;

    // 1. Auto-detect platform and switch tab
    if (url.includes('instagram.com')) {
      if (activeTab !== 'instagram') {
        const tabInsta = document.getElementById('tab-insta');
        if (tabInsta) tabInsta.click();
      }
    } else if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('tiktok.com') || url.includes('vimeo.com') || url.includes('twitter.com') || url.includes('x.com')) {
      if (activeTab === 'instagram') {
        const tabVideo = document.getElementById('tab-yt-video');
        if (tabVideo) tabVideo.click();
      }
    }

    // 2. Trigger fetch immediately
    fetchMedia();
  }

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    urlInput.focus();
    hideElement(previewSection);
    hideElement(progressSection);
    hideElement(errorBox);
    activeMediaInfo = null;
    if (sseSource) {
      sseSource.close();
    }
  });

  // Execute Fetch on Enter key
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      fetchMedia();
    }
  });

  fetchBtn.addEventListener('click', fetchMedia);

  // --- Fetch Media Info ---
  async function fetchMedia() {
    const url = urlInput.value.trim();
    if (!url) return;

    // Reset UI states
    hideElement(errorBox);
    hideElement(previewSection);
    hideElement(progressSection);
    setLoadingState(true);
    activeMediaInfo = null;

    if (sseSource) {
      sseSource.close();
    }

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to fetch video information.');
      }

      activeMediaInfo = data;
      displayPreview(data);
    } catch (err) {
      console.error(err);
      errorMessage.textContent = err.message;
      showElement(errorBox);
    } finally {
      setLoadingState(false);
    }
  }

  function displayPreview(data) {
    previewThumbnail.src = data.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=320&h=180&fit=crop';
    
    // Set duration
    if (data.duration) {
      previewDuration.textContent = data.duration;
      showElement(previewDuration);
    } else {
      hideElement(previewDuration);
    }

    // Set badge text & colors
    if (data.extractor === 'youtube') {
      previewBadge.textContent = 'YouTube';
      previewBadge.style.background = '#e50914';
    } else if (data.extractor === 'instagram') {
      previewBadge.textContent = 'Instagram';
      previewBadge.style.background = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
    } else {
      previewBadge.textContent = data.extractor || 'Link';
      previewBadge.style.background = '#333333';
    }

    previewTitle.textContent = data.title;
    previewAuthor.textContent = data.uploader;

    // Populate format options dynamically
    const formatSelect = document.getElementById('format-select');
    formatSelect.innerHTML = '';
    
    if (data.type === 'instagram' || data.extractor === 'instagram') {
      const opt = document.createElement('option');
      opt.value = 'instagram_best';
      opt.textContent = 'Original Media (Default)';
      formatSelect.appendChild(opt);
    } else {
      // Video/Audio platforms (YouTube, TikTok, Facebook, etc.)
      const videoGroup = document.createElement('optgroup');
      videoGroup.label = 'Video Quality Options';

      const bestOpt = document.createElement('option');
      bestOpt.value = 'video_best';
      bestOpt.textContent = 'Video - Best Quality (Default)';
      videoGroup.appendChild(bestOpt);

      if (data.resolutions && data.resolutions.length > 0) {
        data.resolutions.forEach(res => {
          const opt = document.createElement('option');
          opt.value = `video_${res}`;
          let label = `Video - ${res}p`;
          if (res >= 2160) label += ' (4K Ultra HD)';
          else if (res >= 1440) label += ' (2K Quad HD)';
          else if (res >= 1080) label += ' (Full HD)';
          else if (res >= 720) label += ' (HD)';
          else if (res >= 480) label += ' (SD)';
          opt.textContent = label;
          videoGroup.appendChild(opt);
        });
      } else {
        const fallbacks = [
          { val: '1080', lbl: 'Video - 1080p (Full HD)' },
          { val: '720', lbl: 'Video - 720p (HD)' },
          { val: '480', lbl: 'Video - 480p (SD)' },
          { val: '360', lbl: 'Video - 360p' }
        ];
        fallbacks.forEach(f => {
          const opt = document.createElement('option');
          opt.value = `video_${f.val}`;
          opt.textContent = f.lbl;
          videoGroup.appendChild(opt);
        });
      }
      formatSelect.appendChild(videoGroup);

      const audioGroup = document.createElement('optgroup');
      audioGroup.label = 'Audio Only (MP3)';

      const audios = [
        { val: '320K', lbl: 'Audio - Extreme Quality (320kbps)' },
        { val: '256K', lbl: 'Audio - High Quality (256kbps)' },
        { val: '128K', lbl: 'Audio - Standard Quality (128kbps)' },
        { val: '64K', lbl: 'Audio - Low Quality (64kbps)' }
      ];
      audios.forEach(a => {
        const opt = document.createElement('option');
        opt.value = `audio_${a.val}`;
        opt.textContent = a.lbl;
        audioGroup.appendChild(opt);
      });
      formatSelect.appendChild(audioGroup);
    }

    showElement(previewSection);
    previewSection.scrollIntoView({ behavior: 'smooth' });
  }

  // --- Trigger Local Download ---
  downloadBtn.addEventListener('click', async () => {
    if (!activeMediaInfo) return;

    hideElement(errorBox);
    showElement(progressSection);
    progressSection.scrollIntoView({ behavior: 'smooth' });

    // Reset progress tracking metrics
    progressPercent.textContent = '0%';
    progressFill.style.width = '0%';
    speedText.textContent = 'Initializing...';
    etaText.textContent = '--:--';
    consoleOutput.textContent = 'Launching yt-dlp downloader...\n';
    statusText.textContent = 'Starting download...';

    // Disable download btn during active downloads
    downloadBtn.disabled = true;

    try {
      const formatValue = document.getElementById('format-select').value;
      const splitIndex = formatValue.indexOf('_');
      const dlType = formatValue.substring(0, splitIndex); // "video", "audio", or "instagram"
      const dlFormat = formatValue.substring(splitIndex + 1);

      activeTab = dlType; // update activeTab state for history saving

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: activeMediaInfo.original_url,
          type: dlType,
          title: activeMediaInfo.title,
          formatOption: dlFormat
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start download.');
      }

      const taskId = data.taskId;
      trackProgress(taskId);
    } catch (err) {
      console.error(err);
      statusText.textContent = 'Download error occurred';
      consoleOutput.textContent += `\n[Error] ${err.message}\n`;
      downloadBtn.disabled = false;
    }
  });

  // --- Track Download Progress (SSE) ---
  function trackProgress(taskId) {
    if (sseSource) {
      sseSource.close();
    }

    sseSource = new EventSource(`/api/progress/${taskId}`);

    sseSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update progress bar
        const progress = Math.min(Math.max(data.progress, 0), 100);
        progressPercent.textContent = `${Math.round(progress)}%`;
        progressFill.style.width = `${progress}%`;

        // Update status text
        if (data.status === 'downloading') {
          statusText.textContent = 'Downloading media assets...';
        } else if (data.status === 'merging') {
          statusText.textContent = 'Merging video & audio streams...';
        } else if (data.status === 'extracting') {
          statusText.textContent = 'Extracting audio & converting to MP3...';
        } else if (data.status === 'completed') {
          statusText.textContent = 'Download finished!';
        } else if (data.status === 'failed') {
          statusText.textContent = 'Download failed.';
        }

        // Update speed and eta metrics
        speedText.textContent = data.speed || '0 KB/s';
        etaText.textContent = data.eta || '--:--';

        // Update Console Logs
        if (data.logs && data.logs.length > 0) {
          const newLogs = data.logs.join('\n');
          // Simple dedup checking
          if (!consoleOutput.textContent.endsWith(newLogs)) {
            consoleOutput.textContent += '\n' + data.logs.join('\n');
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    sseSource.addEventListener('end', () => {
      console.log('SSE connection complete.');
      sseSource.close();
      downloadBtn.disabled = false;

      // Automatically trigger file download of the saved asset
      triggerBrowserDownload(taskId);

      // Save to local history
      saveToHistory({
        id: taskId,
        title: activeMediaInfo.title,
        type: activeTab,
        uploader: activeMediaInfo.uploader,
        date: new Date().toLocaleDateString()
      });
    });

    sseSource.onerror = (err) => {
      console.error('SSE Error:', err);
      sseSource.close();
      downloadBtn.disabled = false;
      statusText.textContent = 'Connection lost. Download may continue in background.';
    };
  }

  function triggerBrowserDownload(taskId) {
    const a = document.createElement('a');
    a.href = `/api/file/${taskId}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- Collapsible hacker logs output toggle ---
  consoleToggleBtn.addEventListener('click', () => {
    if (consoleOutput.classList.contains('hidden')) {
      consoleOutput.classList.remove('hidden');
      consoleToggleBtn.textContent = 'Hide';
    } else {
      consoleOutput.classList.add('hidden');
      consoleToggleBtn.textContent = 'Show Logs';
    }
  });

  // --- Loading UI states helper ---
  function setLoadingState(isLoading) {
    if (isLoading) {
      fetchBtn.disabled = true;
      urlInput.disabled = true;
      btnSpinner.style.display = 'block';
    } else {
      fetchBtn.disabled = false;
      urlInput.disabled = false;
      btnSpinner.style.display = 'none';
    }
  }

  // --- Element visibility utilities ---
  function hideElement(el) {
    el.classList.add('hidden');
  }

  function showElement(el) {
    el.classList.remove('hidden');
  }

  // --- Local Session History Manager ---
  function loadHistory() {
    const history = JSON.parse(localStorage.getItem('videoad_history') || '[]');
    if (history.length === 0) {
      showElement(historyEmpty);
      hideElement(historyList);
    } else {
      hideElement(historyEmpty);
      showElement(historyList);
      historyList.innerHTML = '';
      
      history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        let displayType = 'Video';
        if (item.type === 'audio') displayType = 'Audio';
        if (item.type === 'instagram') displayType = 'Instagram';

        li.innerHTML = `
          <div class="history-details">
            <span class="history-title" title="${item.title}">${item.title}</span>
            <div class="history-meta">
              <span class="history-badge ${item.type}">${displayType}</span>
              <span>by ${item.uploader}</span>
              <span>•</span>
              <span>${item.date}</span>
            </div>
          </div>
          <button class="history-dl-btn" data-id="${item.id}">Download</button>
        `;
        
        // Attachment handler for previous downloads
        li.querySelector('.history-dl-btn').addEventListener('click', () => {
          triggerBrowserDownload(item.id);
        });

        historyList.appendChild(li);
      });
    }
  }

  function saveToHistory(item) {
    let history = JSON.parse(localStorage.getItem('videoad_history') || '[]');
    // Avoid double inserts
    history = history.filter(h => h.title !== item.title || h.type !== item.type);
    history.unshift(item); // insert at start
    
    // Cap history size to 5 entries
    if (history.length > 5) {
      history.pop();
    }
    
    localStorage.setItem('videoad_history', JSON.stringify(history));
    loadHistory();
  }

  // --- Extension Status & Modal Setup ---
  const extHelperBtn = document.getElementById('ext-helper-btn');
  const extStatusText = document.getElementById('ext-status-text');
  const extModal = document.getElementById('ext-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const extDoneBtn = document.getElementById('ext-done-btn');
  const copyPathBtn = document.getElementById('copy-path-btn');

  const copyUrlBtn = document.getElementById('copy-url-btn');

  let extensionActive = false;

  // Listen for the custom event sent from the extension's content.js
  window.addEventListener('VideoAdExtensionLoaded', () => {
    extensionActive = true;
    updateExtensionUI();
  });

  // Ping the extension to check if it is already loaded
  window.dispatchEvent(new CustomEvent('PingVideoAdExtension'));
  
  // Safety timeout check after page load settles
  setTimeout(updateExtensionUI, 800);

  // Modal display toggles
  extHelperBtn.addEventListener('click', () => {
    extModal.classList.remove('hidden');
  });

  const hideModal = () => extModal.classList.add('hidden');
  closeModalBtn.addEventListener('click', hideModal);
  if (extDoneBtn) extDoneBtn.addEventListener('click', hideModal);

  extModal.addEventListener('click', (e) => {
    if (e.target === extModal) hideModal();
  });

  // Clipboard copy utilities with 2-second visual feedback status check
  async function copyToClipboard(text, btnElement) {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = btnElement.textContent;
      btnElement.textContent = 'Copied!';
      btnElement.style.background = '#34c759';
      btnElement.style.color = '#ffffff';
      
      setTimeout(() => {
        btnElement.textContent = originalText;
        btnElement.style.background = '';
        btnElement.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  let resolvedExtensionPath = '';

  async function loadExtensionPath() {
    try {
      const response = await fetch('/api/extension-path');
      const data = await response.json();
      resolvedExtensionPath = data.path;
      const pathCode = document.getElementById('path-code');
      if (pathCode) {
        pathCode.textContent = data.path;
      }
    } catch (err) {
      console.error('Failed to load extension path:', err);
    }
  }

  // Initialize extension path load
  loadExtensionPath();

  if (copyPathBtn) {
    copyPathBtn.addEventListener('click', () => {
      const pathToCopy = resolvedExtensionPath || 'c:\\Users\\Asus\\Downloads\\universal\\chrome-extension';
      copyToClipboard(pathToCopy, copyPathBtn);
    });
  }

  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', () => {
      copyToClipboard('chrome://extensions/', copyUrlBtn);
    });
  }

  function updateExtensionUI() {
    if (extensionActive) {
      extHelperBtn.classList.remove('not-installed');
      extHelperBtn.classList.add('installed');
      extStatusText.textContent = 'Extension Active';
    } else {
      extHelperBtn.classList.remove('installed');
      extHelperBtn.classList.add('not-installed');
      extStatusText.textContent = 'Extension Offline';
    }
  }

  // --- Auto-fill & Download via URL Query Parameters ---
  const urlParams = new URLSearchParams(window.location.search);
  const queryUrl = urlParams.get('url');
  const autoDownload = urlParams.get('auto') === 'true';

  if (queryUrl) {
    const decodedUrl = decodeURIComponent(queryUrl);
    urlInput.value = decodedUrl;
    clearBtn.style.display = 'block';
    
    // Auto trigger fetch
    fetchMedia().then(() => {
      if (autoDownload) {
        // Wait until downloadBtn is active and click it
        const interval = setInterval(() => {
          if (activeMediaInfo && !downloadBtn.disabled) {
            clearInterval(interval);
            downloadBtn.click();
          }
        }, 100);
        // Safety timeout to clear interval if metadata fetch fails
        setTimeout(() => clearInterval(interval), 15000);
      }
    });
  }

  // Initialize history load
  loadHistory();

  // Attach click handler to the footer to open downloads folder
  const footer = document.querySelector('.app-footer');
  if (footer) {
    footer.title = 'Click to open local downloads folder';
    footer.addEventListener('click', async () => {
      try {
        await fetch('/api/open-downloads', { method: 'POST' });
      } catch (err) {
        console.error('Failed to request opening downloads folder:', err);
      }
    });
  }
});
