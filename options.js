// options.js

const textarea = document.getElementById("patterns");
const savedMsg = document.getElementById("saved-msg");

// Load
chrome.storage.sync.get({ patterns: [] }, (data) => {
  textarea.value = data.patterns.join("\n");
});

function parsePatterns(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function showSaved() {
  savedMsg.classList.add("visible");
  setTimeout(() => savedMsg.classList.remove("visible"), 2000);
}

document.getElementById("save").addEventListener("click", () => {
  const patterns = parsePatterns(textarea.value);
  chrome.storage.sync.set({ patterns }, () => {
    textarea.value = patterns.join("\n");
    showSaved();
  });
});

document.getElementById("clear").addEventListener("click", () => {
  if (confirm("Remove all patterns?")) {
    chrome.storage.sync.set({ patterns: [] }, () => {
      textarea.value = "";
      showSaved();
    });
  }
});
