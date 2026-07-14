<div align="center">

<img src="https://img.shields.io/badge/VideoAd-Video%20Downloader-ff0f0f?style=for-the-badge&logo=youtube&logoColor=white" alt="VideoAd"/>

# VideoAd — Open Source Video & Audio Downloader

**A self-hosted, zero-cloud video and audio downloader powered by a local Node.js server and a companion Chrome Extension.**  
Download videos, audio, and reels from YouTube, Instagram, and 1000+ supported sites — all from your own machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-latest-ff0f0f?style=flat-square)](https://github.com/yt-dlp/yt-dlp)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome)](https://developer.chrome.com/docs/extensions/)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-ff69b4?style=flat-square)](https://github.com/Saarangggg/videoad)

[🚀 Quick Start](#-quick-start) · [📖 Features](#-features) · [🔌 Extension Setup](#-chrome-extension-setup) · [🛠 Architecture](#-architecture) · [🤝 Contributing](#-contributing)

</div>

> [!IMPORTANT]
> **🚀 One-Click Windows Installation:**
> - **Method A (Easiest):** Open PowerShell (or Command Prompt) and run this one-line command to download and start the installer immediately:
>   ```powershell
>   powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Saarangggg/videoad/main/install_videoad.bat' -OutFile \"$env:USERPROFILE\Desktop\install_videoad.bat\" -UseBasicParsing; Start-Process -FilePath \"$env:USERPROFILE\Desktop\install_videoad.bat\" -Verb RunAs"
>   ```
> - **Method B:** **Right-click** [**this link (install_videoad.bat)**](https://raw.githubusercontent.com/Saarangggg/videoad/main/install_videoad.bat) and choose **"Save link as..."** or **"Save target as..."** to download it directly as a `.bat` file (do not left-click it directly, or Chrome will just show it as text). Double-click the saved file to run.

---

## 📖 What is VideoAd?

**VideoAd** is a fully open-source, locally hosted media downloader developed by [**5araang**](https://github.com/Saarangggg) that runs entirely on your own computer — no cloud servers, no subscriptions, no data collection. It pairs a sleek **web dashboard** (served at `http://localhost:48774`) with a **Chrome Extension** that detects videos on any webpage and lets you download them instantly with one click.

It is built on top of [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) — the world's most powerful open-source media extractor — and supports **1000+ websites** out of the box including YouTube, Instagram, Twitter/X, Reddit, Vimeo, TikTok, SoundCloud, and more.

> **Why self-hosted?** Developed by 5araang with absolute privacy in mind. No rate limits. No ads. No accounts. No sending your history to a third-party server. Your downloads, your machine.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎬 **Video Downloads** | Download best quality MP4 — or choose a specific resolution (1080p, 720p, 480p…) |
| 🎵 **Audio Extraction** | Rip audio as high-quality MP3 directly from any video |
| 📸 **Instagram Reels** | Download Instagram Reels and posts using one-click cookie connect |
| 🔍 **On-Page Media Detector** | A floating toast appears automatically when a video is detected on any webpage |
| 🖱 **Right-Click Context Menu** | Right-click any video link or page to trigger an instant download |
| 📊 **Live Download Progress** | Real-time progress bar, speed, and ETA shown in the extension popup |
| 🌐 **1000+ Sites Supported** | Powered by yt-dlp — works on YouTube, Vimeo, Twitter, Reddit, TikTok, and hundreds more |
| 🔒 **100% Local & Private** | All downloads happen on your own machine — no external servers involved |
| ⚡ **Auto-Setup Installer** | One-click `install_videoad.bat` downloads `yt-dlp` and `ffmpeg` automatically if missing |
| 🛡 **Ad & Tracker Blocker** | Built-in blocker for video ads, banners, trackers, popup tabs, YouTube Music ads, and Instagram story ads |
| 🔌 **Chrome Extension** | Companion extension for in-page detection, popup controls, and download triggering |

---

## 🚀 Quick Start

### Prerequisites

- **Windows** (10 or 11)
- **[Node.js](https://nodejs.org/)** v18 or newer
- **Google Chrome** browser

---

## 💾 Installation

To download and install VideoAd automatically on Windows:

### ⚡ Easiest: Run in PowerShell
Copy and paste this single command into your Windows PowerShell and press **Enter**. It will automatically download the installer, prompt for Admin elevation, and complete the setup:

```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Saarangggg/videoad/main/install_videoad.bat' -OutFile \"$env:USERPROFILE\Desktop\install_videoad.bat\" -UseBasicParsing; Start-Process -FilePath \"$env:USERPROFILE\Desktop\install_videoad.bat\" -Verb RunAs"
```

### 📥 Alternative: Manual Download
1. **Right-click** [**this link (install_videoad.bat)**](https://raw.githubusercontent.com/Saarangggg/videoad/main/install_videoad.bat) and choose **"Save link as..."** or **"Save target as..."** to save the file to your computer.
   *(Do not left-click it directly, or your browser will display the script's raw code as text.)*
2. Double-click the downloaded `install_videoad.bat` file to run the installer.

---

### What the installer does:
- ✅ Checks for Node.js.
- ✅ Creates a clean directory at `C:\VideoAd` and extracts the source code.
- ✅ Downloads standalone `yt-dlp.exe` and `ffmpeg.exe` binaries directly into `C:\VideoAd`.
- ✅ Installs all Node.js dependencies (`npm install --production`).
- ✅ Configures the `videoad://` custom protocol handler for background launcher integration.
- ✅ Places a **VideoAd Downloader** shortcut on your Desktop.
- ✅ Starts the server **silently in the background** and opens the dashboard.

---

### 💻 Manual Clone Setup

If you prefer to clone the repository manually:
1. Clone the repository:
   ```bash
   git clone https://github.com/Saarangggg/videoad.git
   cd videoad
   ```
2. Double-click `install_videoad.bat` (it will elevate to Admin, copy files to `C:\VideoAd`, and set up the silent background shortcut exactly like the one-click installer).

---

## 🔌 Chrome Extension Setup

Once setup is complete, load the Chrome Extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle switch in the top-right corner).
3. Click **"Load unpacked"**.
4. Select the **`C:\VideoAd\chrome-extension`** directory (or the `chrome-extension/` folder inside your manual clone).
5. The VideoAd icon will appear in your toolbar. Open it and verify the status shows **Connected**.

---

## 🛡 Ad & Tracker Blocker

VideoAd includes a built-in, dynamic ad-blocking system inside the companion Chrome Extension:
- **Automatic Ad Skipping:** Instantly skips video ads on YouTube and audio ads on YouTube Music (playback is muted and speed-boosted to 16x, automatically clicking the skip button).
- **Instagram Ad Skippers:** Auto-skips sponsored Stories slides and hides sponsored posts from your home feed dynamically.
- **Redirection & Popunder Blocker:** Intercepts and blocks programmatic popups and popunder ads (typical on movie/streaming sites) safely without violating Content Security Policy (CSP).
- **Clean Interface:** Safely hides all visual display ads, companion ads, and sponsored banners without breaking main site navigation headers or video players.
- **Easy Toggle:** Turn the ad blocker on or off at any time using the **Ad & Tracker Blocker** switch inside the extension settings panel.

---

## 🏃 Silent Background Running

VideoAd runs completely **in the background with no terminal windows visible**.
- When you double-click the **VideoAd Downloader** Desktop shortcut, it starts silently and opens your browser.
- When the Chrome Extension detects a video and prompts you to start, it launches the server automatically in the background using the custom registered protocol.
- The console log windows will **never** interrupt or clutter your desktop!

To stop the background server, open a command prompt and run:
```cmd
taskkill /f /im node.exe
```

---

### Connecting Instagram

Instagram downloads require your session cookies. The extension handles this safely:

1. Make sure you are **logged into Instagram in Chrome**
2. Open the extension popup → click the **⚙ Settings** gear icon
3. In the **Instagram** section, click **"Connect"**
4. The status dot turns 🟢 **green** once your session cookies are saved locally
5. You can now download any Instagram Reel or post without interruption

> Your cookies are saved locally on your machine in `instagram_cookies.txt` — they are never sent anywhere externally.

---

## 🗑 Uninstalling

To completely remove VideoAd from your system:

### ⚡ Easiest: Run in PowerShell
Copy and paste this single command into your Windows PowerShell and press **Enter** to stop the server, delete custom protocol registry keys, delete Desktop shortcuts, and remove the `C:\VideoAd` installation folder:

```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Saarangggg/videoad/main/uninstall_videoad.bat' -OutFile \"$env:USERPROFILE\Desktop\uninstall_videoad.bat\" -UseBasicParsing; Start-Process -FilePath \"$env:USERPROFILE\Desktop\uninstall_videoad.bat\" -Verb RunAs"
```

### 📥 Alternative: Manual Download
1. **Right-click** [**this link (uninstall_videoad.bat)**](https://raw.githubusercontent.com/Saarangggg/videoad/main/uninstall_videoad.bat) and choose **"Save link as..."** to save the uninstaller script.
2. Double-click the downloaded `uninstall_videoad.bat` file to run the cleanup tool.

---

## 📁 Project Structure

```
videoad/
├── 📄 server.js                  # Express backend — yt-dlp orchestration + API
├── 📄 package.json               # Node.js dependencies
├── 📄 setup_and_run.bat          # One-click installer & launcher
├── 📄 run_downloader.bat         # Quick server restart shortcut (Desktop)
├── 📁 public/                    # Frontend web dashboard
│   ├── index.html                # Download UI (paste URL, view progress)
│   ├── app.js                    # Frontend logic
│   └── style.css                 # Glassmorphism dark UI styles
├── 📁 chrome-extension/          # Chrome Extension
│   ├── manifest.json             # Extension configuration (Manifest V3)
│   ├── popup.html                # Extension popup UI
│   ├── popup.js                  # Popup interaction logic
│   ├── background.js             # Service worker (context menus, messaging)
│   ├── content.js                # Bridge between page and background
│   ├── detector.js               # On-page media detection + floating toast
│   ├── detector.css              # Toast overlay styling
│   └── icon.png                  # Extension icon
├── 📁 downloads/                 # Temporary download storage (auto-cleaned)
├── 📄 .gitignore
└── 📄 README.md
```

---

## 🛠 Architecture

```
┌──────────────────────────────────┐
│         Chrome Browser           │
│                                  │
│  ┌────────────────────────────┐  │
│  │   Chrome Extension         │  │
│  │  ┌──────────┐ ┌─────────┐ │  │
│  │  │ popup.js │ │detector │ │  │
│  │  └──────────┘ └─────────┘ │  │
│  │       │ sendMessage        │  │
│  │  ┌────────────────────┐   │  │
│  │  │   background.js    │   │  │
│  │  │  (Service Worker)  │   │  │
│  │  └────────────────────┘   │  │
│  └────────────┬───────────────┘  │
│               │ HTTP fetch        │
└───────────────┼──────────────────┘
                ▼
┌──────────────────────────────────┐
│   Local Node.js Server :48774    │
│                                  │
│  POST /api/info    → yt-dlp      │
│  POST /api/download → yt-dlp     │
│  GET  /api/tasks   → progress    │
│  POST /api/save-cookies → file   │
│  GET  /api/instagram-cookie-status│
│                                  │
│   yt-dlp + ffmpeg (local bins)  │
└──────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js · Express · child_process (spawn) |
| **Media Extraction** | [yt-dlp](https://github.com/yt-dlp/yt-dlp) (standalone binary) |
| **Audio/Video Merge** | [FFmpeg](https://ffmpeg.org/) (static binary) |
| **Frontend UI** | HTML5 · Vanilla JavaScript · CSS3 (Glassmorphism) |
| **Extension** | Chrome Extension Manifest V3 · Service Workers |
| **Protocol Launcher** | Windows Registry `HKCU\Software\Classes\videoad` |

---

## 🌐 Supported Sites

VideoAd supports all sites supported by `yt-dlp`, including:

**YouTube** · **Instagram** · **Twitter / X** · **TikTok** · **Reddit** · **Vimeo** · **Dailymotion** · **SoundCloud** · **Twitch** · **Facebook** · **Pinterest** · **LinkedIn** · **Bilibili** · and [1000+ more →](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)

---

## 🔧 Configuration & Usage

### Starting the server manually

```bash
npm start
# Server runs at http://localhost:48774
```

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/info` | Fetch video title, thumbnail, duration, formats |
| `POST` | `/api/download` | Start a background download task |
| `GET` | `/api/tasks` | List all active download tasks |
| `GET` | `/api/download-file/:id` | Serve a completed download file |
| `POST` | `/api/cancel/:id` | Cancel an active download |
| `POST` | `/api/save-cookies` | Save Instagram session cookies from extension |
| `GET` | `/api/instagram-cookie-status` | Check if Instagram cookies are saved |
| `GET` | `/api/extension-path` | Serve extension path for self-registration |

### Download Types

| Type | Format | Notes |
|---|---|---|
| `video` | MP4 (best quality) | Merges best video + audio streams via FFmpeg |
| `audio` | MP3 | Strips audio track and converts |
| `video` + resolution | MP4 (custom height) | e.g. limit to 720p |

---

## 🛡 Privacy & Security

- **No telemetry** — the app never phones home or logs anything externally.
- **No authentication** — runs on `localhost` only (accessible from your LAN if needed).
- **Cookies stay local** — Instagram session cookies are written to `instagram_cookies.txt` on your own machine only.
- **Auto file cleanup** — downloaded files in the `/downloads/` folder are automatically deleted after 1 hour.
- **`.gitignore` protected** — `instagram_cookies.txt`, `*.pem`, `node_modules/`, and `downloads/` are excluded from version control.

---

## 🤝 Contributing

Contributions are welcome and appreciated! Whether it's a bug fix, new feature, or documentation improvement.

### How to Contribute

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/my-new-feature`
3. **Commit** your changes: `git commit -m "Add my feature"`
4. **Push** to the branch: `git push origin feature/my-new-feature`
5. **Open a Pull Request** on GitHub

### Ideas for Contributions

- [ ] Add Firefox extension support
- [ ] Subtitle/caption download option
- [ ] Playlist batch download support
- [ ] Download history / library view
- [ ] macOS / Linux setup script equivalents
- [ ] Cookie connect support for Twitter, TikTok

---

## 📋 Troubleshooting

**Server won't start?**
- Make sure Node.js is installed: `node --version`
- Delete `node_modules/` and run `npm install` again

**yt-dlp or ffmpeg not found?**
- Re-run `setup_and_run.bat` — it will re-download missing binaries automatically

**Instagram downloads fail?**
- Make sure you're logged into Instagram in Chrome
- Open the extension popup → Settings → Instagram → click **Connect**
- The status dot must be 🟢 green before attempting a download

**"Extension context invalidated" errors in console?**
- This is harmless — it happens when the extension reloads while pages are open
- Reload the extension at `chrome://extensions/` to reset

**Chrome cookie database locked?**
- Do NOT use `--cookies-from-browser` manually — use the extension **Connect** button instead (it reads cookies through the Chrome API, bypassing the file lock entirely)

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

```
MIT License — Copyright (c) 2025 Saarang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## ⭐ Star History

If VideoAd has been useful to you, please consider giving it a ⭐ on GitHub — it helps others discover the project!

[![GitHub stars](https://img.shields.io/github/stars/Saarangggg/videoad?style=social)](https://github.com/Saarangggg/videoad/stargazers)

---

<div align="center">

Made with ❤️ by [Saarang](https://github.com/Saarangggg) ([Instagram](https://www.instagram.com/5araang/))

[⬆ Back to top](#videoad--open-source-video--audio-downloader)

</div>
