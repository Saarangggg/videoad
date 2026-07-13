# VideoAd - Open-Source Video & Audio Downloader Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-green.svg)](https://nodejs.org/)
[![Platform Support](https://img.shields.io/badge/platform-Windows-blue.svg)](#)

VideoAd is a powerful, self-hosted open-source video and audio downloader tool. It features a lightweight client web application with responsive glassmorphism UI, a Node.js server engine, and an automated Chrome Extension companion with on-screen media scanners and right-click context menu integration.

---

## 🌟 Key Features

- **Multi-Source Support:** Download videos and extract audio (MP3) from YouTube, Instagram, and generic direct web video streams.
- **On-Screen Auto-Detection Popup:** Automatically detects playing media elements on pages (like YouTube) and displays a floating Toast alert with a single-click `"View More"` button.
- **Chrome Extension Helper:** A settings dashboard within the extension lets you choose which context categories to capture (Videos, Audio, Images, Links, Pages).
- **Public Local Network Access:** The backend runs on host interface `0.0.0.0` on port `48774`, allowing other computers and devices on your local network to access the web downloader dashboard.
- **Background Execution:** Integrated custom URI schema mappings (`videoad://`) enable silent background downloader launches without asking for Windows UAC administrator prompts.

---

## 🚀 Quick Start & Installation

### 1. Download & Automatic Setup
We provide a single-click helper script to install dependencies, register protocol schemas, and boot the service in the background:

1. Clone or download this project repository:
   ```bash
   git clone https://github.com/Saarangggg/videoad.git
   cd videoad
   ```
2. Double-click the file named **`setup_and_run.bat`** in the root directory.
3. The script will install Node modules, configure Registry parameters under `HKEY_CURRENT_USER`, and launch the web server at `http://localhost:48774/`.

---

## 🔌 Chrome Extension Setup

To enable page detection and context menus, load the companion extension:

1. Open your browser and navigate to: **`chrome://extensions/`**
2. Enable **"Developer mode"** in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the **`chrome-extension`** folder inside your cloned `videoad` directory.
5. Once loaded, click the extension icon to manage options or trigger downloads!

---

## 🛠️ System Architecture & Technology Stack

- **Backend Server:** Node.js, Express, `ytdl-core`, `fluent-ffmpeg` (supports concurrent video extraction, merging, and MP3 conversions).
- **Client Frontend:** HTML5, Vanilla JavaScript, CSS3 variables, Glassmorphism, and responsive CSS grids.
- **Protocol Launcher:** Registry entries mapped under HKCU (`HKEY_CURRENT_USER\Software\Classes\videoad`) trigger native shell launchers silently inside Windows PowerShell.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
