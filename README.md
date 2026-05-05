# 🛡️ Distraction Free Web

A browser extension that helps you stay focused by hiding distracting elements from popular websites and setting daily time limits.

![Distraction Free Web](icons/icon128.png)

## ✨ Features

- **Hide Distractions** — Automatically hides recommended content, shorts, reels, comments, trending sections, and more from popular sites.
- **Time Limits** — Set a daily usage limit (in minutes) per website. When reached, a full-screen overlay reminds you to take a break.
- **Per-Site Configuration** — Clean accordion-based UI lets you toggle individual features for each website.
- **Cross-Browser** — Works on both **Firefox** and **Chrome** (Manifest V3).

## 🌐 Supported Websites

| Website | What you can hide |
|---------|-------------------|
| **YouTube** | Shorts, Side Recommendations, Comments, End Screens. Redirect Home → Subscriptions. |
| **X (Twitter)** | Trending, Who to Follow. |
| **Twitch** | Recommended Channels, Front Page Carousel. Redirect Home → Following. |
| **LinkedIn** | News Feed, LinkedIn News, Network Suggestions. |
| **Instagram** | Reels, Explore Tab. Redirect Home → Following. |
| **Facebook** | Reels, Stories. |
| **TikTok** | For You Tab, Explore Tab. Redirect Home → Following. |

## 📦 Installation

### Firefox

1. Download or clone this repository:
   ```bash
   git clone https://github.com/Toneto17/Distraction-Free-Web.git
   ```
2. Open Firefox and navigate to `about:debugging`.
3. Click **"This Firefox"** in the left sidebar.
4. Click **"Load Temporary Add-on..."**.
5. Navigate to the cloned folder and select the `manifest.json` file.
6. The extension icon will appear in your toolbar — click it to configure.

> **Note:** Temporary add-ons are removed when Firefox is closed. For permanent installation, the extension would need to be published on [addons.mozilla.org](https://addons.mozilla.org).

### Chrome / Edge / Brave

1. Download or clone this repository:
   ```bash
   git clone https://github.com/Toneto17/Distraction-Free-Web.git
   ```
2. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`).
3. Enable **"Developer mode"** (toggle in the top-right corner).
4. Click **"Load unpacked"**.
5. Select the cloned folder (the one containing `manifest.json`).
6. The extension icon will appear in your toolbar.

## 🖥️ How It Works

### Popup Interface

Click the extension icon to open the popup. You'll see an **accordion list** of supported websites:

- **Click a website name** to expand its settings.
- **Toggle switches** turn individual features on/off (e.g., "Hide Shorts" on YouTube).
- **Time Limit** section lets you set a daily usage cap in minutes. Hit **Save** to apply.

### Content Blocking

When you visit a supported website, the extension:

1. **Injects CSS rules** to hide the distracting elements you've enabled.
2. **Redirects** the homepage to a less distracting page (e.g., YouTube Home → Subscriptions) if configured.
3. **Tracks usage time** in the background.
4. **Shows a block overlay** when your daily time limit is reached, with an option to dismiss.

### Data Storage

- All preferences and limits are stored using the browser's `storage.sync` API (with `storage.local` fallback).
- Usage data resets daily automatically.

## 🔧 Project Structure

```
Distraction-Free-Web/
├── manifest.json          # Extension manifest (MV3)
├── _locales/
│   └── en/messages.json   # Internationalization strings
├── config/
│   └── rules.js           # Website rules and selectors
├── icons/                 # Extension icons (16–128px)
├── popup/
│   ├── popup.html         # Popup structure
│   ├── popup.css          # Popup styling (dark theme)
│   └── popup.js           # Popup logic (accordions, toggles)
├── scripts/
│   ├── background.js      # Background service worker (time tracking, alarms)
│   └── content.js         # Content script (CSS injection, redirects)
└── styles/
    └── overlays.css       # Block overlay styles
```

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b my-feature`.
3. Commit your changes: `git commit -m "Add my feature"`.
4. Push to the branch: `git push origin my-feature`.
5. Open a Pull Request.

## 📄 License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
