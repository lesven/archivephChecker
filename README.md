# archive.ph Checker

A browser extension (Chrome / Edge / Firefox\*) that silently checks in the background whether pages you defined are already archived at [archive.ph](https://archive.ph). The result is displayed as a badge on the extension icon and in a popup — without any manual action required.

---

## Why this exists

archive.ph is a common tool for preserving web content against link rot, paywalls, or post-publication edits. Manually checking whether a snapshot exists for a given page is tedious. This extension automates that check for any URL pattern you define and surfaces the result passively while you browse.

---

## Features

- **Background check** — triggers automatically when a monitored tab is opened or navigated to
- **Badge indicator** on the extension icon: instant visual feedback per tab
- **Popup** with full status, direct link to the snapshot, and action buttons
- **Configurable URL patterns** — wildcard support, managed via a dedicated options page
- **In-memory cache** per URL with a 1-hour TTL to avoid redundant requests
- **Re-check on demand** — clears cache for the current URL and re-runs the check immediately
- **Submit shortcut** — opens archive.ph's submit page for the current URL with one click
- No external dependencies, no background servers, no telemetry

---

## How it works

### Archive detection

The extension calls `https://archive.ph/newest/<encoded-url>` for each monitored page. archive.ph's behavior is deterministic:

- **Snapshot exists** → HTTP redirect to the snapshot URL (e.g. `https://archive.ph/xK3Rp`)
- **No snapshot** → stays on the `newest/` path or redirects to the submit form

The check reads `response.url` after following the redirect and evaluates:

```
isArchived = finalUrl.startsWith("https://archive.ph/")
          && !finalUrl.startsWith("https://archive.ph/newest/")
          && !finalUrl.includes("submit")
```

No scraping, no content scripts, no DOM parsing required.

### URL pattern matching

Patterns are converted to regular expressions at match time. Special regex characters are escaped; `*` is treated as a wildcard (`.*`). Matching is case-insensitive and anchored at the start of the URL.

| Pattern | Matches |
|---|---|
| `https://www.spiegel.de/politik/*` | All articles under `/politik/` |
| `https://*.reuters.com/article/*` | All Reuters article URLs on any subdomain |
| `https://example.com/specific-page.html` | Exact URL only |

### Badge states

| Badge | Color | Meaning |
|---|---|---|
| `✓` | Green | Snapshot exists at archive.ph |
| `✗` | Red | No snapshot found |
| `…` | Grey | Check in progress |
| `!` | Yellow | Network error during check |
| *(empty)* | — | URL not in monitored patterns |

---

## Architecture

```
archive-checker/
├── manifest.json       # MV3 manifest: permissions, entry points
├── background.js       # Service worker: tab events, archive check, cache, badge
├── popup.html          # Popup UI markup and styles
├── popup.js            # Popup logic: read session state, re-check trigger, submit
├── options.html        # Options page markup and styles
├── options.js          # Options logic: load/save patterns from chrome.storage.sync
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Storage

| Storage type | Used for |
|---|---|
| `chrome.storage.sync` | URL patterns — synced across devices via browser account |
| `chrome.storage.session` | Per-tab check results — scoped to the current browser session |
| In-memory (`archiveCache`) | Result cache in the service worker — persists until service worker is terminated |

### Permissions

| Permission | Reason |
|---|---|
| `tabs` | Read the URL of the active tab |
| `storage` | Persist patterns and session results |
| `https://archive.ph/*` | Fetch the archive check endpoint |
| `<all_urls>` | Required to read `tab.url` for all monitored domains |

---

## Installation

### Chrome / Edge (developer mode)

1. Download and unzip the repository or clone it:
   ```bash
   git clone https://github.com/<your-username>/archive-checker.git
   ```
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
3. Enable **Developer mode** (toggle top right)
4. Click **Load unpacked** and select the `archive-checker` folder
5. The extension icon appears in the toolbar

### Firefox*

Firefox support requires minor adjustments (`browser` namespace, `manifest_version: 2` or MV3 compatibility flag). Not included in the current release.

---

## Configuration

1. Click the extension icon → **⚙ Manage sites**, or right-click the icon → **Options**
2. Enter one URL pattern per line — wildcards (`*`) are supported
3. Click **Save**

Changes take effect immediately on the next tab activation or page load.

**Example configuration:**
```
https://www.spiegel.de/politik/*
https://www.faz.net/aktuell/*
https://*.reuters.com/article/*
https://netzpolitik.org/*
```

Lines starting with `#` are ignored (comments).

---

## Known limitations

- **No official archive.ph API** — the check relies on observable HTTP redirect behavior, which could change without notice
- **Rate limiting** — archive.ph may throttle requests if many tabs are checked in quick succession; affected checks will show the `!` (error) badge
- **Service worker lifecycle** — Chrome may terminate the background service worker after inactivity; the in-memory cache is lost on restart, but `storage.session` results are preserved until the tab is closed
- **`<all_urls>` permission** — required to read tab URLs across all domains; the extension makes outbound requests only to `archive.ph`, never to the monitored pages themselves

---

## Development

No build step required. All files are plain HTML, CSS, and JavaScript (ES2020+, no transpilation).

To iterate:
1. Edit source files
2. Go to `chrome://extensions` → click the reload icon on the extension card
3. Close and reopen the popup to pick up JS changes

---

## License

MIT — see [LICENSE](LICENSE)
