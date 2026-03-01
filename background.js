// background.js – Archive.ph Checker
// Checks if the current tab URL is archived at archive.ph

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour per result
const archiveCache = {}; // { url: { status, checkedAt, archiveUrl } }

// --- Matching ---

function urlMatchesPattern(url, pattern) {
  try {
    // Support wildcards: *.example.com, exact URLs, or plain domains
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape special chars (not *)
      .replace(/\*/g, ".*");
    const regex = new RegExp(`^${escaped}`, "i");
    return regex.test(url);
  } catch {
    return false;
  }
}

async function getMonitoredPatterns() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ patterns: [] }, (data) => resolve(data.patterns));
  });
}

function isMonitored(url, patterns) {
  return patterns.some((p) => urlMatchesPattern(url, p));
}

// --- Archive Check ---

async function checkArchive(pageUrl) {
  const cached = archiveCache[pageUrl];
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached;
  }

  const checkUrl = `https://archive.ph/newest/${encodeURIComponent(pageUrl)}`;
  let result;

  try {
    const response = await fetch(checkUrl, {
      method: "GET",
      redirect: "follow",
    });

    // archive.ph redirects to the snapshot URL (e.g. https://archive.ph/AbCdE)
    // If not archived, it returns the "submit" page at the original checkUrl path
    const finalUrl = response.url;
    const isArchived =
      finalUrl.startsWith("https://archive.ph/") &&
      !finalUrl.startsWith("https://archive.ph/newest/") &&
      !finalUrl.includes("submit");

    result = {
      status: isArchived ? "archived" : "not_archived",
      archiveUrl: isArchived ? finalUrl : null,
      checkedAt: Date.now(),
    };
  } catch (err) {
    result = {
      status: "error",
      error: err.message,
      archiveUrl: null,
      checkedAt: Date.now(),
    };
  }

  archiveCache[pageUrl] = result;
  return result;
}

// --- Badge Update ---

function setBadge(tabId, status) {
  const config = {
    archived: { text: "✓", color: "#22c55e" },
    not_archived: { text: "✗", color: "#ef4444" },
    checking: { text: "…", color: "#94a3b8" },
    error: { text: "!", color: "#f59e0b" },
    ignored: { text: "", color: "#000000" },
  };
  const c = config[status] || config.ignored;
  chrome.action.setBadgeText({ tabId, text: c.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: c.color });
}

// --- Main Tab Handler ---

async function handleTab(tabId, url) {
  if (!url || url.startsWith("chrome://") || url.startsWith("about:")) {
    setBadge(tabId, "ignored");
    return;
  }

  const patterns = await getMonitoredPatterns();

  if (!isMonitored(url, patterns)) {
    setBadge(tabId, "ignored");
    return;
  }

  setBadge(tabId, "checking");

  const result = await checkArchive(url);
  setBadge(tabId, result.status);

  // Store result so popup can read it
  chrome.storage.session.set({ [`result_${tabId}`]: { url, ...result } });
}

// --- Event Listeners ---

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) handleTab(tabId, tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    handleTab(tabId, tab.url);
  }
});

// Recheck message from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "recheck" && msg.tabId && msg.url) {
    delete archiveCache[msg.url];
    handleTab(msg.tabId, msg.url);
  }
});

// Clear session storage on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`result_${tabId}`);
});
