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

function storageSet(obj) {
  return new Promise((resolve) => {
    try {
      const result = api.storage.sync.set(obj);
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(() => {
          api.storage.local.set(obj).then(resolve).catch(resolve);
        });
      } else {
        api.storage.sync.set(obj, () => resolve());
      }
    } catch (e) {
      resolve();
    }
  });
}

/* ─── State ─── */
let currentActiveDomain = null;
let domainStartTime = 0;
let dismissedDomains = {};

/* ─── Functions ─── */
function checkLimitAndNotify(domain, totalSeconds) {
  storageGet(['limits']).then((data) => {
    const limits = data.limits || {};
    if (limits[domain] && totalSeconds >= limits[domain] * 60) {
      if (!dismissedDomains[domain]) {
        api.tabs.query({ url: `*://*.${domain}/*` }).then((tabs) => {
          tabs.forEach(tab => {
            api.tabs.sendMessage(tab.id, { action: "LIMIT_REACHED" }).catch(() => {});
          });
        }).catch(() => {});
      }
    }
  });
}

function updateUsage() {
  if (!currentActiveDomain || !domainStartTime) return;
  const now = Date.now();
  const seconds = Math.floor((now - domainStartTime) / 1000);
  if (seconds > 0) {
    storageGet(['usageData']).then((result) => {
      const usage = result.usageData || {};
      usage[currentActiveDomain] = (usage[currentActiveDomain] || 0) + seconds;
      storageSet({ usageData: usage });
      checkLimitAndNotify(currentActiveDomain, usage[currentActiveDomain]);
    });
  }
  domainStartTime = now;
}

function setActiveDomain(domain) {
  if (currentActiveDomain === domain) return;
  if (currentActiveDomain) updateUsage();
  currentActiveDomain = domain;
  domainStartTime = domain ? Date.now() : 0;
}

function getDomainFromTab(tab) {
  try {
    if (tab && tab.url && tab.url.startsWith("http")) {
      return new URL(tab.url).hostname.replace('www.', '');
    }
  } catch (e) {}
  return null;
}

/* ─── Event Listeners ─── */
api.tabs.onActivated.addListener(info => {
  api.tabs.get(info.tabId).then(tab => {
    setActiveDomain(getDomainFromTab(tab));
  }).catch(() => setActiveDomain(null));
});

api.tabs.onUpdated.addListener((id, change, tab) => {
  if (tab.active) {
    const domain = getDomainFromTab(tab);
    if (domain) setActiveDomain(domain);
  }
});

api.windows.onFocusChanged.addListener(wId => {
  if (wId === api.windows.WINDOW_ID_NONE) {
    setActiveDomain(null);
  } else {
    api.tabs.query({ active: true, windowId: wId }).then(tabs => {
      setActiveDomain(getDomainFromTab(tabs[0]));
    }).catch(() => {});
  }
});

/* ─── Alarms ─── */
api.alarms.create("resetDailyData", { periodInMinutes: 60 });
api.alarms.create("saveTimeProgress", { periodInMinutes: 1 / 6 });

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "resetDailyData") {
    const today = new Date().toDateString();
    storageGet(['currentDate']).then((data) => {
      if (data.currentDate !== today) {
        storageSet({ usageData: {}, currentDate: today });
        dismissedDomains = {};
      }
    });
  }
  if (alarm.name === "saveTimeProgress" && currentActiveDomain) {
    updateUsage();
  }
});

api.runtime.onInstalled.addListener(() => {
  storageSet({ currentDate: new Date().toDateString() });
});

api.runtime.onMessage.addListener((message) => {
  if (message.action === "DISMISS_LIMIT" && message.domain) {
    dismissedDomains[message.domain] = true;
  }
});
