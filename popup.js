// popup.js

const labels = {
  archived:     "Archived ✓",
  not_archived: "Not archived",
  checking:     "Checking…",
  error:        "Check failed",
  ignored:      "Not monitored",
};

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function render() {
  const tab = await getCurrentTab();
  if (!tab) return;

  const row = document.getElementById("status-row");
  const dot = document.getElementById("dot");
  const label = document.getElementById("status-label");
  const urlDisplay = document.getElementById("url-display");
  const archiveLink = document.getElementById("archive-link");
  const checkedAt = document.getElementById("checked-at");

  urlDisplay.textContent = tab.url || "";

  const key = `result_${tab.id}`;
  const stored = await chrome.storage.session.get(key);
  const result = stored[key];

  let status = result?.status ?? "ignored";

  // Clean all classes
  ["archived", "not_archived", "checking", "error", "ignored"].forEach((s) => {
    row.classList.remove(s);
    dot.classList.remove(s);
  });

  row.classList.add(status);
  dot.classList.add(status);
  label.textContent = labels[status] ?? status;

  if (status === "archived" && result?.archiveUrl) {
    archiveLink.href = result.archiveUrl;
    archiveLink.style.display = "block";
  } else {
    archiveLink.style.display = "none";
  }

  if (result?.checkedAt) {
    const d = new Date(result.checkedAt);
    checkedAt.textContent = `Last checked: ${d.toLocaleTimeString()}`;
  } else {
    checkedAt.textContent = "";
  }
}

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("btn-recheck").addEventListener("click", async () => {
  const tab = await getCurrentTab();
  if (!tab) return;
  // Clear cache entry via message to background
  await chrome.storage.session.remove(`result_${tab.id}`);
  // Trigger re-check by sending a message
  chrome.runtime.sendMessage({ action: "recheck", tabId: tab.id, url: tab.url });
  document.getElementById("status-label").textContent = "Checking…";
  setTimeout(render, 1500);
});

document.getElementById("btn-submit").addEventListener("click", async () => {
  const tab = await getCurrentTab();
  if (!tab?.url) return;
  const submitUrl = `https://archive.ph/?run=1&url=${encodeURIComponent(tab.url)}`;
  chrome.tabs.create({ url: submitUrl });
});

render();
