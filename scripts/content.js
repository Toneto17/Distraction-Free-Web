const api = typeof browser !== "undefined" ? browser : chrome;
const usesPromiseApi = typeof browser !== "undefined";

function storageGet(areaName, keys) {
  const area = api.storage && api.storage[areaName];
  if (!area) return Promise.resolve({});

  if (usesPromiseApi) {
    return area.get(keys).catch(() => {
      if (areaName === "sync" && api.storage.local) {
        return api.storage.local.get(keys).catch(() => ({}));
      }
      return {};
    });
  }

  return new Promise((resolve) => {
    try {
      area.get(keys, (data) => {
        if (api.runtime.lastError && areaName === "sync" && api.storage.local) {
          api.storage.local.get(keys, (localData) => resolve(localData || {}));
          return;
        }
        resolve(data || {});
      });
    } catch (error) {
      resolve({});
    }
  });
}

function sendRuntimeMessage(message) {
  try {
    const result = api.runtime.sendMessage(message);
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch (error) {}
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isMobileContext() {
  return /^m\./i.test(window.location.hostname) || window.matchMedia("(max-width: 700px)").matches;
}

const matchedSite = typeof dfwGetSiteEntryForHost === "function"
  ? dfwGetSiteEntryForHost(window.location.hostname)
  : null;
const siteDomain = matchedSite ? matchedSite.domain : null;
const siteRules = matchedSite ? matchedSite.site : null;
let isDismissed = false;

function clearInjectedRules() {
  const style = document.getElementById("distraction-free-styles");
  if (style) style.remove();

  const overlay = document.getElementById("dfw-block-overlay");
  if (overlay) overlay.remove();
}

function showBlockOverlay(limitMinutes, usedSeconds) {
  if (isDismissed) return;
  if (document.getElementById("dfw-block-overlay")) return;

  const usedMinutes = Math.floor((usedSeconds || 0) / 60);
  const overlay = document.createElement("div");
  const icon = document.createElement("div");
  const title = document.createElement("div");
  const message = document.createElement("div");
  const button = document.createElement("button");

  overlay.id = "dfw-block-overlay";
  icon.className = "dfw-block-icon";
  icon.textContent = "Time";
  title.className = "dfw-block-title";
  title.textContent = "Daily Limit Reached";
  message.className = "dfw-block-message";
  message.textContent = `You've used ${usedMinutes}m of the ${limitMinutes}m you set for this site today.`;
  button.id = "dfw-dismiss-btn";
  button.type = "button";
  button.textContent = "Skip Limit Today";

  overlay.appendChild(icon);
  overlay.appendChild(title);
  overlay.appendChild(message);
  overlay.appendChild(button);
  document.documentElement.appendChild(overlay);

  button.addEventListener("click", () => {
    isDismissed = true;
    sendRuntimeMessage({ action: "DISMISS_LIMIT", domain: siteDomain });
    overlay.remove();
  });
}

try {
  api.runtime.onMessage.addListener((message) => {
    if (!message) return;

    if (message.action === "LIMIT_REACHED") {
      if (message.domain && message.domain !== siteDomain) return;
      showBlockOverlay(message.limitMinutes, message.usedSeconds);
    }

    if (message.action === "EXTENSION_STATE_CHANGED") {
      if (message.enabled === false) {
        clearInjectedRules();
        return;
      }

      Promise.all([
        storageGet("sync", ["settings", "preferences"]),
        storageGet("local", ["limits"]),
        storageGet("local", ["usageByDate", "usageData"])
      ]).then(([syncData, limitData, localData]) => {
        processRules({ ...syncData, limits: limitData.limits || {} }, localData);
      });
    }
  });
} catch (error) {}

function getTodayUsage(data) {
  const usageByDate = data.usageByDate || {};
  const todayUsage = usageByDate[todayKey()] || {};
  if (todayUsage[siteDomain] !== undefined) return todayUsage[siteDomain];

  const legacyUsage = data.usageData || {};
  return legacyUsage[siteDomain] || 0;
}

function shouldRedirect(feature) {
  if (!feature.from || !feature.from.includes(window.location.pathname)) return false;
  if (window.location.search && !feature.allowQuery) return false;
  return window.location.pathname !== feature.to;
}

function processRules(syncData, localData) {
  const settings = syncData.settings || {};
  if (settings.enabled === false) {
    clearInjectedRules();
    return;
  }

  const userPrefs = syncData.preferences || {};
  const limits = syncData.limits || {};
  const context = { isMobile: isMobileContext() };
  let cssString = "";

  siteRules.features.forEach((feature) => {
    if (!dfwIsFeatureEnabled(feature, userPrefs)) return;

    if (feature.type === "redirect") {
      if (shouldRedirect(feature)) {
        window.location.replace(feature.to);
      }
      return;
    }

    dfwGetFeatureSelectors(feature, context).forEach((selector) => {
      cssString += `${selector} { display: none !important; visibility: hidden !important; }\n`;
    });
  });

  if (cssString) {
    const injectStyles = () => {
      const existing = document.getElementById("distraction-free-styles");
      if (existing) {
        existing.textContent = cssString;
        return;
      }

      const style = document.createElement("style");
      style.id = "distraction-free-styles";
      style.textContent = cssString;
      (document.head || document.documentElement).appendChild(style);
    };

    if (document.documentElement) injectStyles();
    else document.addEventListener("DOMContentLoaded", injectStyles);
  }

  const limitMinutes = limits[siteDomain];
  const usedSeconds = getTodayUsage(localData);
  if (limitMinutes && usedSeconds >= limitMinutes * 60) {
    showBlockOverlay(limitMinutes, usedSeconds);
  }
}

if (siteRules) {
  Promise.all([
    storageGet("sync", ["settings", "preferences"]),
    storageGet("local", ["limits"]),
    storageGet("local", ["usageByDate", "usageData"])
  ]).then(([syncData, limitData, localData]) => {
    processRules({ ...syncData, limits: limitData.limits || {} }, localData);
  });
}
