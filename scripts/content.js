/* ─── Cross-browser API helpers ─── */
const api = typeof browser !== 'undefined' ? browser : chrome;

function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      const result = api.storage.sync.get(keys);
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(() => {
          api.storage.local.get(keys).then(resolve).catch(() => resolve({}));
        });
      } else {
        api.storage.sync.get(keys, (data) => {
          if (api.runtime.lastError) {
            api.storage.local.get(keys, (d) => resolve(d || {}));
          } else {
            resolve(data || {});
          }
        });
      }
    } catch (e) {
      resolve({});
    }
  });
}

/* ─── State ─── */
const hostname = window.location.hostname.replace('www.', '');
const siteRules = typeof DISTRACTION_RULES !== 'undefined' ? DISTRACTION_RULES[hostname] : null;
let isDismissed = false;

/* ─── Block Overlay ─── */
function showBlockOverlay() {
  if (isDismissed) return;
  if (document.getElementById('dfw-block-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'dfw-block-overlay';
  overlay.innerHTML = `
    <div class="dfw-block-icon">⏳</div>
    <div class="dfw-block-title">Daily Limit Reached</div>
    <div class="dfw-block-message">You've used all the time you set for this site today. Take a break — you deserve it.</div>
    <button id="dfw-dismiss-btn">Continue Browsing</button>
  `;
  document.documentElement.appendChild(overlay);

  const btn = document.getElementById('dfw-dismiss-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      isDismissed = true;
      try {
        api.runtime.sendMessage({ action: "DISMISS_LIMIT", domain: hostname }).catch(() => {});
      } catch (e) {}
      overlay.remove();
    });
  }
}

/* ─── Message Listener ─── */
try {
  api.runtime.onMessage.addListener((message) => {
    if (message.action === "LIMIT_REACHED") {
      if (!isDismissed) {
        showBlockOverlay();
      }
    }
  });
} catch (e) {}

/* ─── Main Logic ─── */
if (siteRules) {
  storageGet(['preferences', 'limits', 'usageData', 'currentDate']).then((data) => {
    processRules(data);
  });
}

function processRules(data) {
  const userPrefs = data.preferences || {};
  const limits = data.limits || {};
  const usageData = data.usageData || {};

  // 1. Inject CSS hiding rules
  let cssString = '';
  siteRules.features.forEach(feature => {
    const isActive = userPrefs[feature.id] !== false;
    if (isActive) {
      if (feature.type === 'redirect') {
        if (feature.from.includes(window.location.pathname) && window.location.search === "") {
          window.location.replace(feature.to);
        }
      } else if (feature.selectors) {
        feature.selectors.forEach(selector => {
          cssString += `${selector} { display: none !important; visibility: hidden !important; }\n`;
        });
      }
    }
  });

  if (cssString) {
    const injectStyles = () => {
      if (document.getElementById('distraction-free-styles')) return;
      const style = document.createElement('style');
      style.id = 'distraction-free-styles';
      style.textContent = cssString;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.documentElement) injectStyles();
    else document.addEventListener('DOMContentLoaded', injectStyles);
  }

  // 2. Check time limit
  const today = new Date().toDateString();
  if (data.currentDate === today && limits[hostname] && usageData[hostname] >= limits[hostname] * 60) {
    showBlockOverlay();
  }
}
