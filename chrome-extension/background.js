const activeDownloads = new Map();

// Update context menu on install or startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['active'], (result) => {
    // Set active default to true so it works out of the box when installed
    const active = result.active !== undefined ? !!result.active : true;
    chrome.storage.local.set({ active }, () => {
      updateContextMenu(active);
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['active'], (result) => {
    const active = result.active !== undefined ? !!result.active : true;
    updateContextMenu(active);
  });
});

// Listener for toggle from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleActive') {
    updateContextMenu(message.active);
  } else if (message.action === 'refreshContextMenus') {
    chrome.storage.local.get(['active'], (result) => {
      const active = result.active !== undefined ? !!result.active : true;
      updateContextMenu(active);
    });
  } else if (message.action === 'triggerDownload') {
    startDownload(message.url, message.title, message.type);
  } else if (message.action === 'getActiveDownloads') {
    const list = Array.from(activeDownloads.values());
    sendResponse({ downloads: list });
  }
  return true;
});

function updateContextMenu(active) {
  chrome.storage.local.get([
    'detectVideo', 'detectAudio', 'detectImage', 'detectLink', 'detectPage'
  ], (result) => {
    const contexts = [];
    if (result.detectVideo !== false) contexts.push('video');
    if (result.detectAudio !== false) contexts.push('audio');
    if (result.detectImage !== false) contexts.push('image');
    if (result.detectLink !== false) contexts.push('link');
    if (result.detectPage !== false) contexts.push('page');

    chrome.contextMenus.removeAll(() => {
      if (active && contexts.length > 0) {
        chrome.contextMenus.create({
          id: 'videoad-download',
          title: 'Download with VideoAd',
          contexts: contexts
        });
      }
    });
  });
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'videoad-download') {
    const targetUrl = info.srcUrl || info.linkUrl || info.pageUrl;
    if (targetUrl) {
      // Open the local downloader web app in a new tab, auto-populating URL and triggering download
      chrome.tabs.create({
        url: `http://localhost:48774/?url=${encodeURIComponent(targetUrl)}&auto=true`
      });
    }
  }
});

async function startDownload(url, pageTitle, type = 'video') {
  const tempId = 'temp-' + Date.now();
  activeDownloads.set(tempId, {
    id: tempId,
    title: pageTitle || 'Video Download',
    progress: 0,
    status: 'downloading',
    speed: 'Connecting...',
    eta: '--:--'
  });
  chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});

  try {
    // 1. Fetch metadata info first to check connection and resolve proper title
    const infoResponse = await fetch('http://localhost:48774/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!infoResponse.ok) {
      const errorData = await infoResponse.json();
      throw new Error(errorData.error || 'Failed to fetch video information');
    }

    const info = await infoResponse.json();
    const videoTitle = info.title || 'Video Download';

    // Update provisional item title
    const dl = activeDownloads.get(tempId);
    if (dl) dl.title = videoTitle;
    chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});

    // 2. Trigger local server download
    const downloadResponse = await fetch('http://localhost:48774/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        type: type,
        title: videoTitle
      })
    });

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.json();
      throw new Error(errorData.error || 'Failed to trigger download');
    }

    const { taskId } = await downloadResponse.json();

    // Map the tempId to the real taskId
    activeDownloads.delete(tempId);
    activeDownloads.set(taskId, {
      id: taskId,
      title: videoTitle,
      progress: 0,
      status: 'pending',
      speed: '0 B/s',
      eta: '--:--'
    });

    // Create a progress notification that will be updated dynamically
    chrome.notifications.create(taskId, {
      type: 'progress',
      iconUrl: 'icon.png',
      title: 'VideoAd: Initializing...',
      message: `Preparing to download: "${videoTitle}"`,
      progress: 0,
      priority: 1
    });

    chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});

    // 3. Monitor download progress
    monitorProgress(taskId, videoTitle);

  } catch (err) {
    console.error('Download failed to start:', err);
    activeDownloads.delete(tempId);
    
    // Show notification for failure
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'VideoAd: Download Error',
      message: err.message.includes('Failed to fetch') 
        ? 'Cannot connect to local VideoAd server. Please run "run_downloader.bat" on your Desktop to start the server.'
        : `Error: ${err.message}`,
      priority: 2
    });
    chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});
  }
}

async function monitorProgress(taskId, title) {
  try {
    const response = await fetch(`http://localhost:48774/api/progress/${taskId}`);
    if (!response.ok) throw new Error('Progress stream is not available');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            const dl = activeDownloads.get(taskId);
            
            if (dl) {
              dl.status = data.status;
              dl.progress = data.progress;
              dl.speed = data.speed;
              dl.eta = data.eta;
            }

            // Update badge text showing progress percentage
            chrome.action.setBadgeText({ text: `${Math.round(data.progress)}%` });
            chrome.action.setBadgeBackgroundColor({ color: '#e50914' });

            // Dynamically update the Windows/Chrome progress notification
            let progressMsg = `Downloading... speed: ${data.speed || '0 B/s'}, ETA: ${data.eta || '--:--'}`;
            if (data.status === 'merging') progressMsg = 'Merging video & audio streams...';
            else if (data.status === 'extracting') progressMsg = 'Converting formats / extracting MP3...';

            chrome.notifications.create(taskId, {
              type: 'progress',
              iconUrl: 'icon.png',
              title: `VideoAd: ${Math.round(data.progress)}% downloaded`,
              message: title,
              progress: Math.min(Math.max(Math.round(data.progress), 0), 100),
              contextMessage: progressMsg,
              priority: 1
            });

            chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});

            if (data.status === 'completed') {
              handleComplete(taskId, title);
              return;
            } else if (data.status === 'failed') {
              handleFailed(taskId, title, 'Download script failed internally.');
              return;
            }
          } catch (e) {
            console.error('Error parsing progress stream packet:', e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in progress connection loop:', err);
    handleFailed(taskId, title, err.message);
  }
}

function handleComplete(taskId, title) {
  // Clear progress notification
  chrome.notifications.clear(taskId);

  const dl = activeDownloads.get(taskId);
  if (dl) {
    dl.status = 'completed';
    dl.progress = 100;
  }

  // Clear badge
  chrome.action.setBadgeText({ text: '' });

  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'VideoAd: Download Complete!',
    message: `"${title}" has been downloaded. Saving file to disk.`,
    priority: 2
  });

  // Trigger Chrome browser to download file from local server to user's downloads folder
  chrome.downloads.download({
    url: `http://localhost:48774/api/file/${taskId}`,
    conflictAction: 'uniquify'
  });

  chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});

  // Remove from active popup list after 5 seconds
  setTimeout(() => {
    activeDownloads.delete(taskId);
    chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});
  }, 5000);
}

function handleFailed(taskId, title, errorMsg) {
  // Clear progress notification
  chrome.notifications.clear(taskId);

  const dl = activeDownloads.get(taskId);
  if (dl) {
    dl.status = 'failed';
  }

  chrome.action.setBadgeText({ text: 'ERR' });
  chrome.action.setBadgeBackgroundColor({ color: '#ff453a' });

  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'VideoAd: Download Failed',
    message: `"${title}" download failed: ${errorMsg}`,
    priority: 2
  });

  chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});

  setTimeout(() => {
    activeDownloads.delete(taskId);
    chrome.action.setBadgeText({ text: '' });
    chrome.runtime.sendMessage({ action: 'downloadProgressUpdate' }).catch(() => {});
  }, 7000);
}
