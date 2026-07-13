# VideoAd Downloader - Chrome Extension

A premium Chrome Extension helper that allows you to download videos instantly via your locally running VideoAd Downloader.

## Features

- **Context Menu Integration**: Right-click any video element, link, or page and select **"Download with VideoAd"**.
- **Real-time Progress Tracker**: Click the extension popup to view connection status and track background downloads in a sleek dashboard.
- **Chrome Desktop Notifications**: Get notified when a download starts, fails, or completes.
- **Auto-save**: Once the local server finishes downloading, it automatically triggers a browser download to save the final file directly into your local `Downloads` folder.

## How to Install

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` by pasting it in the address bar.
3. Toggle the **Developer mode** switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `chrome-extension` folder inside this project directory (`c:\Users\Asus\Downloads\universal\chrome-extension`).

## How to Use

1. Start your local VideoAd server by running:
   ```bash
   node server.js
   ```
2. Click the VideoAd extension icon in your Chrome toolbar.
3. Ensure the connection indicator says **"Server: Connected"** and the toggle is turned **ON**.
4. Browse to any video (e.g. on YouTube or Instagram).
5. Right-click the video, link, or anywhere on the page, and select **"Download with VideoAd"**.
6. The extension will fetch the metadata, download the video via the local server, and automatically prompt a file download when done!
