const api = typeof browser !== "undefined" ? browser : chrome;
const usesPromiseApi = typeof browser !== "undefined";

const STYLE_ID = "distraction-free-styles";
const OVERLAY_ID = "dfw-block-overlay";
const REFRESH_DELAY_MS = 120;
const URL_CHECK_INTERVAL_MS = 800;

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
const initialPathname = window.location.pathname;
const initialSearch = window.location.search;

let isDismissed = false;
let expectedCssString = "";
let refreshTimer = null;
let refreshSequence = 0;
let lastHref = window.location.href;
let rulesAreDisabled = false;
let ruleObserver = null;
let urlWatcher = null;
let startupPassPending = true;

function respond(sendResponse, payload) {
  if (typeof sendResponse !== "function") return;

  try {
    sendResponse(payload);
  } catch (error) {}
}

function clearInjectedRules() {
  expectedCssString = "";

  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();

  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

function applyRuleStyles(cssString) {
  expectedCssString = cssString;

  const existing = document.getElementById(STYLE_ID);
  if (!cssString) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    if (existing.textContent !== cssString) {
      existing.textContent = cssString;
    }
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssString;
  const parent = document.head || document.documentElement;
  if (!parent) {
    document.addEventListener("DOMContentLoaded", () => applyRuleStyles(cssString), { once: true });
    return;
  }

  parent.appendChild(style);
}

function showBlockOverlay(limitMinutes, usedSeconds) {
  if (!siteDomain || isDismissed) return true;
  if (document.getElementById(OVERLAY_ID)) return true;
  if (!document.documentElement) return false;

  const limit = Number(limitMinutes) || 0;
  const usedMinutes = Math.floor((Number(usedSeconds) || 0) / 60);
  const overlay = document.createElement("div");
  const icon = document.createElement("div");
  const title = document.createElement("div");
  const message = document.createElement("div");
  const button = document.createElement("button");

  overlay.id = OVERLAY_ID;
  icon.className = "dfw-block-icon";
  icon.textContent = "Time";
  title.className = "dfw-block-title";
  title.textContent = "Daily Limit Reached";
  message.className = "dfw-block-message";
  message.textContent = `You've used ${usedMinutes}m of the ${limit}m you set for this site today.`;
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

  return true;
}

function getTodayUsage(data) {
  const usageByDate = data.usageByDate || {};
  const todayUsage = usageByDate[todayKey()] || {};
  if (todayUsage[siteDomain] !== undefined) return todayUsage[siteDomain];

  const legacyUsage = data.usageData || {};
  return legacyUsage[siteDomain] || 0;
}

function shouldRedirect(feature, context) {
  if (feature.initialOnly) {
    if (!context || !context.isStartupPass) return false;
    if (window.location.pathname !== initialPathname || window.location.search !== initialSearch) {
      return false;
    }
  }

  if (!feature.from || !feature.from.includes(window.location.pathname)) return false;
  if (window.location.search && !feature.allowQuery) return false;
  return window.location.pathname !== feature.to;
}

function processRules(syncData, localData, options = {}) {
  if (!siteRules) return false;

  const settings = syncData.settings || {};
  if (settings.enabled === false) {
    rulesAreDisabled = true;
    clearInjectedRules();
    return false;
  }

  rulesAreDisabled = false;

  const userPrefs = syncData.preferences || {};
  const limits = syncData.limits || {};
  const context = { isMobile: isMobileContext() };
  let cssString = "";

  siteRules.features.forEach((feature) => {
    if (!dfwIsFeatureEnabled(feature, userPrefs)) return;

    if (feature.type === "redirect") {
      if (shouldRedirect(feature, options)) {
        window.location.replace(feature.to);
      }
      return;
    }

    dfwGetFeatureSelectors(feature, context).forEach((selector) => {
      cssString += `${selector} { display: none !important; visibility: hidden !important; }\n`;
    });
  });

  applyRuleStyles(cssString);

  const limitMinutes = limits[siteDomain];
  const usedSeconds = getTodayUsage(localData);
  if (limitMinutes && usedSeconds >= limitMinutes * 60) {
    showBlockOverlay(limitMinutes, usedSeconds);
  }

  return true;
}

async function refreshRules(reason) {
  if (!siteRules) return false;

  const sequence = ++refreshSequence;
  const isStartupPass = startupPassPending;
  startupPassPending = false;

  try {
    const [syncData, limitData, localData] = await Promise.all([
      storageGet("sync", ["settings", "preferences"]),
      storageGet("local", ["limits"]),
      storageGet("local", ["usageByDate", "usageData"])
    ]);

    if (sequence !== refreshSequence) return false;
    return processRules({ ...syncData, limits: limitData.limits || {} }, localData, { isStartupPass });
  } catch (error) {
    return false;
  }
}

function scheduleRefresh(reason, delay = REFRESH_DELAY_MS) {
  if (!siteRules) return;

  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refreshRules(reason);
  }, delay);
}

function checkUrlChange(reason, forceRefresh = false) {
  const currentHref = window.location.href;
  const changed = currentHref !== lastHref;
  if (changed) {
    lastHref = currentHref;
  }

  if (changed || forceRefresh) {
    scheduleRefresh(reason, 80);
  }
}

function patchHistoryMethod(methodName) {
  try {
    const original = history[methodName];
    if (typeof original !== "function" || original.__dfwPatched) return;

    const patched = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      checkUrlChange(methodName, true);
      return result;
    };

    Object.defineProperty(patched, "__dfwPatched", { value: true });
    history[methodName] = patched;
  } catch (error) {}
}

function startUrlWatcher() {
  if (urlWatcher || !siteRules) return;

  urlWatcher = setInterval(() => {
    checkUrlChange("url-watch");
  }, URL_CHECK_INTERVAL_MS);
}

function startNavigationListeners() {
  if (!siteRules) return;

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", () => checkUrlChange("popstate", true));
  window.addEventListener("hashchange", () => checkUrlChange("hashchange", true));
  document.addEventListener("yt-navigate-finish", () => checkUrlChange("yt-navigate-finish", true));
  document.addEventListener("yt-page-data-updated", () => checkUrlChange("yt-page-data-updated", true));

  startUrlWatcher();
}

function mutationNeedsRefresh(mutations) {
  if (rulesAreDisabled || !expectedCssString) return false;
  if (!document.getElementById(STYLE_ID)) return true;

  return mutations.some((mutation) => {
    if (mutation.target === document.head || mutation.target === document.documentElement) {
      return !document.getElementById(STYLE_ID);
    }

    return Array.from(mutation.removedNodes || []).some((node) => {
      if (node.id === STYLE_ID) return true;
      return typeof node.querySelector === "function" && Boolean(node.querySelector(`#${STYLE_ID}`));
    });
  });
}

function startRuleObserver() {
  if (ruleObserver || !siteRules || typeof MutationObserver === "undefined") return;

  const observe = () => {
    if (ruleObserver || !document.documentElement) return;

    ruleObserver = new MutationObserver((mutations) => {
      if (mutationNeedsRefresh(mutations)) {
        scheduleRefresh("style-restored", 50);
      }
    });

    ruleObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  if (document.documentElement) {
    observe();
  } else {
    document.addEventListener("DOMContentLoaded", observe, { once: true });
  }
}

try {
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;

    if (message.action === "LIMIT_REACHED") {
      if (message.domain && message.domain !== siteDomain) {
        respond(sendResponse, { ok: false });
        return false;
      }

      const ok = showBlockOverlay(message.limitMinutes, message.usedSeconds);
      respond(sendResponse, { ok });
      return false;
    }

    if (message.action === "EXTENSION_STATE_CHANGED") {
      if (message.enabled === false) {
        rulesAreDisabled = true;
        clearInjectedRules();
        respond(sendResponse, { ok: true });
        return false;
      }

      rulesAreDisabled = false;
      refreshRules("extension-enabled").then((ok) => {
        respond(sendResponse, { ok });
      });
      return true;
    }

    return false;
  });
} catch (error) {}

if (siteRules) {
  startNavigationListeners();
  startRuleObserver();
  scheduleRefresh("initial", 0);
}
