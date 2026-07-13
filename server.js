const express = require('express');
const cors = require('cors');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 48774;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Instagram cookies file path (populated by the Chrome extension via /api/save-cookies)
const instagramCookiesPath = path.join(__dirname, 'instagram_cookies.txt');

// In-memory tasks database
const tasks = new Map();

// Helper to locate node binary path dynamically for yt-dlp JS runtime solver
let nodePath = 'node';
try {
  const whereNode = execSync('where node').toString().trim().split('\r\n')[0];
  if (whereNode) {
    nodePath = whereNode;
  }
} catch (e) {
  console.error('Failed to locate node path dynamically, falling back to default "node":', e.message);
}

console.log(`Detected Node executable path for yt-dlp: "${nodePath}"`);

// Clean-up task: Deletes files older than 1 hour from the downloads directory
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  fs.readdir(downloadsDir, (err, files) => {
    if (err) return console.error('Cleanup error:', err);
    files.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > maxAge) {
          fs.unlink(filePath, () => {
            console.log(`Cleaned up temporary file: ${file}`);
          });
        }
      });
    });
  });
}, 15 * 60 * 1000); // Run every 15 minutes

// Endpoint: Save Instagram cookies (sent by Chrome Extension via chrome.cookies API)
app.post('/api/save-cookies', (req, res) => {
  const { cookies } = req.body;
  if (!cookies || !Array.isArray(cookies)) {
    return res.status(400).json({ error: 'cookies array required' });
  }

  // Write Netscape HTTP cookie format
  const lines = ['# Netscape HTTP Cookie File', '# Exported by VideoAd Chrome Extension', ''];
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
    const flag = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const path_ = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = c.expirationDate ? Math.round(c.expirationDate) : 0;
    lines.push(`${domain}\t${flag}\t${path_}\t${secure}\t${expires}\t${c.name}\t${c.value}`);
  }

  fs.writeFile(instagramCookiesPath, lines.join('\n'), (err) => {
    if (err) {
      console.error('Failed to write instagram_cookies.txt:', err);
      return res.status(500).json({ error: 'Failed to save cookies' });
    }
    console.log(`Saved ${cookies.length} Instagram cookies to instagram_cookies.txt`);
    res.json({ success: true, count: cookies.length });
  });
});

// Endpoint: Check if Instagram cookies are saved
app.get('/api/instagram-cookie-status', (req, res) => {
  const exists = fs.existsSync(instagramCookiesPath);
  let count = 0;
  if (exists) {
    try {
      const content = fs.readFileSync(instagramCookiesPath, 'utf8');
      count = content.split('\n').filter(l => l && !l.startsWith('#')).length;
    } catch (e) {}
  }
  res.json({ connected: exists, cookieCount: count });
});

// Endpoint: Fetch URL info/metadata
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`Fetching info for URL: ${url}`);

  const isInstagram = url.includes('instagram.com');

  const args = [
    '--js-runtimes', `node:${nodePath}`,
    '--remote-components', 'ejs:github',
    '--no-playlist',
    '--dump-json'
  ];

  // Instagram: prefer saved cookie file; fall back to browser cookies
  if (isInstagram) {
    if (fs.existsSync(instagramCookiesPath)) {
      args.push('--cookies', instagramCookiesPath);
    } else {
      args.push('--cookies-from-browser', 'chrome');
    }
    args.push('--extractor-args', 'instagram:api=graphql');
  }

  args.push(url);

  const process = spawn('yt-dlp', args);

  let stdout = '';
  let stderr = '';

  process.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  process.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  process.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp info extraction failed with code ${code}. Stderr: ${stderr}`);
      let userFriendlyError = 'Failed to extract video information.';
      if (stderr.includes('Unsupported URL') || stderr.includes('not a valid URL')) {
        userFriendlyError = 'Unsupported platform or invalid URL. Please check the link.';
      } else if (stderr.includes('Sign in') || stderr.includes('Private video')) {
        userFriendlyError = 'This video or post is private/restricted. Login required.';
      } else if (stderr.includes('CORS') || stderr.includes('HTTP Error 403')) {
        userFriendlyError = 'Access denied by the content provider (HTTP 403 Forbidden).';
      } else if (stderr.includes('empty media response') || stderr.includes('Instagram')) {
        userFriendlyError = 'Instagram requires you to be logged in. Make sure you are logged into Instagram in Chrome, then try again.';
      }
      return res.status(500).json({ error: userFriendlyError, raw: stderr });
    }

    if (!stdout.trim()) {
      console.warn('yt-dlp exited with code 0 but returned empty stdout (no media metadata found).');
      return res.status(400).json({ error: 'No downloadable media found at this URL. Please verify the link points directly to a video or post.' });
    }

    try {
      // Robust JSON extraction to filter out any warning or updates printed to stdout
      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error('No valid JSON metadata block found in yt-dlp output.');
      }
      const jsonString = stdout.substring(jsonStart, jsonEnd + 1);
      const metadata = JSON.parse(jsonString);
      
      // Select appropriate formats/options
      let type = 'video';
      if (metadata.extractor === 'instagram') {
        type = 'instagram';
      }

      // Extract unique video resolutions (heights)
      let resolutions = [];
      if (metadata.formats) {
        const heights = new Set();
        metadata.formats.forEach(f => {
          if (f.height && f.vcodec !== 'none') {
            heights.add(f.height);
          }
        });
        resolutions = Array.from(heights).sort((a, b) => b - a);
      }

      res.json({
        id: metadata.id,
        title: metadata.title || metadata.description || 'Untitled Post',
        thumbnail: metadata.thumbnail || (metadata.thumbnails && metadata.thumbnails.length ? metadata.thumbnails[metadata.thumbnails.length - 1].url : ''),
        duration: metadata.duration ? new Date(metadata.duration * 1000).toISOString().substr(11, 8) : null,
        duration_raw: metadata.duration || 0,
        uploader: metadata.uploader || metadata.channel || 'Unknown Creator',
        type: type,
        extractor: metadata.extractor,
        original_url: url,
        resolutions: resolutions
      });
    } catch (parseError) {
      console.error('Failed to parse metadata JSON:', parseError);
      console.error('Raw stdout was:', stdout);
      res.status(500).json({ 
        error: 'Failed to parse media metadata response.', 
        details: parseError.message, 
        rawStdout: stdout 
      });
    }
  });
});

// Endpoint: Trigger a download task
app.post('/api/download', (req, res) => {
  const { url, type, title, formatOption } = req.body;
  if (!url || !type) {
    return res.status(400).json({ error: 'URL and type are required' });
  }

  const taskId = uuidv4();
  const cleanTitle = (title || 'download').replace(/[\\/:*?"<>|]/g, '_'); // sanitize filename characters
  
  const task = {
    id: taskId,
    url: url,
    type: type,
    title: cleanTitle,
    status: 'pending',
    progress: 0,
    speed: '0B/s',
    eta: '--:--',
    logs: ['Initializing task...'],
    listeners: []
  };

  tasks.set(taskId, task);

  const isInstagram = url.includes('instagram.com');

  // Determine yt-dlp arguments based on type
  let args = [
    '--js-runtimes', `node:${nodePath}`,
    '--remote-components', 'ejs:github',
    '--no-playlist',
    '--newline', // Output progress on new lines
  ];

  // Instagram: prefer saved cookie file; fall back to browser cookies
  if (isInstagram) {
    if (fs.existsSync(instagramCookiesPath)) {
      args.push('--cookies', instagramCookiesPath);
    } else {
      args.push('--cookies-from-browser', 'chrome');
    }
    args.push('--extractor-args', 'instagram:api=graphql');
  }

  if (type === 'audio') {
    const audioQuality = formatOption || '0';
    args.push(
      '-f', 'ba',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', audioQuality,
      '-o', path.join(downloadsDir, `${taskId}.%(ext)s`)
    );
  } else if (type === 'video') {
    let videoFormat = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv+ba/b';
    if (formatOption && formatOption !== 'best') {
      const resLimit = formatOption;
      videoFormat = `bv*[height<=${resLimit}][ext=mp4]+ba[ext=m4a]/b[height<=${resLimit}][ext=mp4]/bv*[height<=${resLimit}]+ba/b[height<=${resLimit}]`;
    }
    args.push(
      '-f', videoFormat,
      '--merge-output-format', 'mp4',
      '-o', path.join(downloadsDir, `${taskId}.%(ext)s`)
    );
  } else {
    // Instagram or generic
    args.push(
      '-o', path.join(downloadsDir, `${taskId}.%(ext)s`)
    );
  }

  args.push(url);

  console.log(`Starting download task ${taskId} with command: yt-dlp ${args.join(' ')}`);

  const child = spawn('yt-dlp', args);
  task.process = child;

  let buffer = '';

  child.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // keep last incomplete line in buffer
    for (const line of lines) {
      if (line.trim()) {
        parseLine(line, taskId);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const errorStr = data.toString();
    console.error(`[Task ${taskId} stderr]: ${errorStr}`);
    task.logs.push(`[error] ${errorStr}`);
    broadcastProgress(taskId);
  });

  child.on('close', (code) => {
    console.log(`[Task ${taskId}] process closed with code ${code}`);
    
    // Check if output file exists
    const files = fs.readdirSync(downloadsDir);
    const downloadedFile = files.find(f => f.startsWith(taskId));

    if (code === 0 && downloadedFile) {
      task.status = 'completed';
      task.progress = 100;
      task.filename = downloadedFile;
      task.logs.push('Download completed successfully.');
    } else {
      task.status = 'failed';
      task.logs.push(`Process exited with code ${code}. Output file could not be verified.`);
    }

    broadcastProgress(taskId, true);
    // Remove process reference
    delete task.process;
  });

  res.json({ taskId });
});

// Helper to parse yt-dlp stdout lines and update task state
function parseLine(line, taskId) {
  const task = tasks.get(taskId);
  if (!task) return;

  task.logs.push(line);

  // Parse progress output
  // Typical output: [download]  12.5% of 10.20MiB at  2.41MiB/s ETA 00:03
  if (line.startsWith('[download]') && line.includes('%')) {
    const percentMatch = line.match(/(\d+(?:\.\d+)?)\%/);
    if (percentMatch) {
      task.progress = parseFloat(percentMatch[1]);
      task.status = 'downloading';
    }

    const speedMatch = line.match(/at\s+([^\s]+)/);
    if (speedMatch) {
      task.speed = speedMatch[1];
    }

    const etaMatch = line.match(/ETA\s+([^\s]+)/);
    if (etaMatch) {
      task.eta = etaMatch[1];
    }
  } else if (line.includes('[Merger]') || line.includes('Merging formats')) {
    task.status = 'merging';
    task.progress = 95;
    task.speed = 'Merging streams...';
    task.eta = '--:--';
  } else if (line.includes('[ExtractAudio]') || line.includes('Extracting audio')) {
    task.status = 'extracting';
    task.progress = 98;
    task.speed = 'Extracting audio...';
    task.eta = '--:--';
  }

  broadcastProgress(taskId);
}

// Broadcast SSE updates to all listeners for a task
function broadcastProgress(taskId, closeStream = false) {
  const task = tasks.get(taskId);
  if (!task) return;

  const data = JSON.stringify({
    status: task.status,
    progress: task.progress,
    speed: task.speed,
    eta: task.eta,
    logs: task.logs.slice(-5) // Send the last 5 logs for size optimization
  });

  task.listeners.forEach(res => {
    res.write(`data: ${data}\n\n`);
    if (closeStream) {
      res.write('event: end\ndata: {}\n\n');
    }
  });
}

// Endpoint: SSE Progress update stream
app.get('/api/progress/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({
    status: task.status,
    progress: task.progress,
    speed: task.speed,
    eta: task.eta,
    logs: task.logs.slice(-5)
  })}\n\n`);

  if (task.status === 'completed' || task.status === 'failed') {
    res.write('event: end\ndata: {}\n\n');
    return res.end();
  }

  task.listeners.push(res);

  req.on('close', () => {
    task.listeners = task.listeners.filter(l => l !== res);
  });
});

// Endpoint: Fetch downloaded file
app.get('/api/file/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task || !task.filename) {
    return res.status(404).json({ error: 'File not found or download incomplete' });
  }

  const filePath = path.join(downloadsDir, task.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Local file expired or deleted' });
  }

  // Preserve the file extension
  const ext = path.extname(task.filename);
  const downloadName = `${task.title}${ext}`;

  res.download(filePath, downloadName, (err) => {
    if (err) {
      console.error(`Error serving file ${task.filename}:`, err);
    }
  });
});

// Endpoint: Open local downloads directory in system explorer
app.post('/api/open-downloads', (req, res) => {
  const { exec } = require('child_process');
  let command = '';

  if (process.platform === 'win32') {
    command = `start "" "${downloadsDir}"`;
  } else if (process.platform === 'darwin') {
    command = `open "${downloadsDir}"`;
  } else {
    command = `xdg-open "${downloadsDir}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.error('Failed to open downloads directory:', err);
      return res.status(500).json({ error: 'Failed to open downloads directory' });
    }
    res.json({ success: true });
  });
});

// Endpoint: Get the absolute local path to the chrome-extension directory
app.get('/api/extension-path', (req, res) => {
  res.json({ path: path.join(__dirname, 'chrome-extension') });
});

// Serves the client application index file on standard routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Server public access on http://${localIP}:${PORT}`);
});
