try {
  if (typeof DISTRACTION_RULES === "undefined" && typeof importScripts === "function") {
    importScripts("../config/rules.js");
  }
} catch (error) {}

const api = typeof browser !== "undefined" ? browser : chrome;
const usesPromiseApi = typeof browser !== "undefined";

const TRACKING_ALARM = "dfwSaveTimeProgress";
const DAILY_ALARM = "dfwDailyMaintenance";
const TRACKING_INTERVAL_MINUTES = 0.5;
const USAGE_HISTORY_DAYS = 30;

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

function storageSet(areaName, obj) {
  const area = api.storage && api.storage[areaName];
  if (!area) return Promise.resolve();

  if (usesPromiseApi) {
    return area.set(obj).catch(() => {
      if (areaName === "sync" && api.storage.local) {
        return api.storage.local.set(obj).catch(() => {});
      }
    });
  }

  return new Promise((resolve) => {
    try {
      area.set(obj, () => {
        if (api.runtime.lastError && areaName === "sync" && api.storage.local) {
          api.storage.local.set(obj, () => resolve());
          return;
        }
        resolve();
      });
    } catch (error) {
      resolve();
    }
  });
}

function storageRemove(areaName, keys) {
  const area = api.storage && api.storage[areaName];
  if (!area || typeof area.remove !== "function") return Promise.resolve();

  if (usesPromiseApi) {
    return area.remove(keys).catch(() => {});
  }

  return new Promise((resolve) => {
    try {
      area.remove(keys, () => resolve());
    } catch (error) {
      resolve();
    }
  });
}

function apiCall(namespace, methodName, ...args) {
  if (!namespace || typeof namespace[methodName] !== "function") {
    return Promise.resolve(undefined);
  }

  if (usesPromiseApi) {
    return namespace[methodName](...args).catch(() => undefined);
  }

  return new Promise((resolve) => {
    try {
      namespace[methodName](...args, (result) => resolve(result));
    } catch (error) {
      resolve(undefined);
    }
  });
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyFromStoredDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? todayKey() : todayKey(parsed);
}

function nextMidnightMs(timestamp) {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

function getSiteEntryForHostname(hostname) {
  if (typeof dfwGetSiteEntryForHost === "function") {
    return dfwGetSiteEntryForHost(hostname);
  }
  return null;
}

function getSiteEntryForDomain(domain) {
  if (typeof dfwGetSiteEntry === "function") {
    return dfwGetSiteEntry(domain);
  }
  return null;
}

function getDomainFromTab(tab) {
  try {
    if (!tab || !tab.url || !tab.url.startsWith("http")) return null;
    const hostname = new URL(tab.url).hostname;
    const entry = getSiteEntryForHostname(hostname);
    return entry ? entry.domain : normalizeTrackedDomain(hostname);
  } catch (error) {
    return null;
  }
}

function normalizeTrackedDomain(hostname) {
  if (typeof dfwNormalizeTrackedDomain === "function") {
    return dfwNormalizeTrackedDomain(hostname);
  }

  const cleanHost = String(hostname || "")
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^(www|m|mobile)\./, "");
  const parts = cleanHost.split(".").filter(Boolean);

  if (parts.length <= 2) return cleanHost;

  const tld = parts[parts.length - 1];
  const secondLevel = parts[parts.length - 2];
  const commonCountrySecondLevels = ["ac", "co", "com", "edu", "gov", "net", "org"];
  const keepParts = tld.length === 2 && commonCountrySecondLevels.includes(secondLevel) ? 3 : 2;
  return parts.slice(-keepParts).join(".");
}

function getTrackingTargetFromTab(tab) {
  const domain = getDomainFromTab(tab);
  if (!domain) return null;

  return { domain };
}

async function getActiveTab() {
  const focusedTabs = await apiCall(api.tabs, "query", { active: true, lastFocusedWindow: true });
  if (Array.isArray(focusedTabs) && focusedTabs[0]) return focusedTabs[0];

  const currentTabs = await apiCall(api.tabs, "query", { active: true, currentWindow: true });
  return Array.isArray(currentTabs) && currentTabs[0] ? currentTabs[0] : null;
}

async function isExtensionEnabled() {
  const data = await storageGet("sync", ["settings"]);
  const settings = data.settings || {};
  return settings.enabled !== false;
}

async function migrateLegacyUsage() {
  const localData = await storageGet("local", ["usageData", "usageByDate", "currentDate", "dfwUsageMigrated"]);
  const syncData = await storageGet("sync", ["usageData", "currentDate"]);
  const legacyUsage = localData.usageData || syncData.usageData || {};

  if (localData.dfwUsageMigrated || Object.keys(legacyUsage).length === 0) {
    return;
  }

  const dateKey = dateKeyFromStoredDate(localData.currentDate || syncData.currentDate);
  const usageByDate = localData.usageByDate || {};
  usageByDate[dateKey] = {
    ...(usageByDate[dateKey] || {}),
    ...legacyUsage
  };

  await storageSet("local", {
    usageByDate,
    usageData: usageByDate[todayKey()] || {},
    dfwUsageMigrated: true
  });
}

async function migrateLimitsToLocal() {
  const [syncData, localData] = await Promise.all([
    storageGet("sync", ["limits"]),
    storageGet("local", ["limits", "dfwLimitsStoredLocally"])
  ]);
  const syncLimits = syncData.limits || {};
  const localLimits = localData.limits || {};

  if (Object.keys(syncLimits).length > 0) {
    await storageSet("local", {
      limits: { ...syncLimits, ...localLimits },
      dfwLimitsStoredLocally: true
    });
    await storageRemove("sync", "limits");
    return;
  }

  if (!localData.dfwLimitsStoredLocally) {
    await storageSet("local", { dfwLimitsStoredLocally: true });
  }
}

function pruneDateMap(dataByDate) {
  const cutoff = Date.now() - USAGE_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const pruned = {};

  Object.entries(dataByDate || {}).forEach(([date, usage]) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() >= cutoff) {
      pruned[date] = usage;
    }
  });

  return pruned;
}

async function addUsageForRange(domain, startMs, endMs) {
  if (!domain || !startMs || !endMs || endMs <= startMs) return 0;

  const data = await storageGet("local", ["usageByDate"]);
  const usageByDate = data.usageByDate || {};
  let cursor = startMs;

  while (cursor < endMs) {
    const segmentEnd = Math.min(endMs, nextMidnightMs(cursor));
    const seconds = Math.floor((segmentEnd - cursor) / 1000);
    if (seconds > 0) {
      const dateKey = todayKey(new Date(cursor));
      usageByDate[dateKey] = usageByDate[dateKey] || {};
      usageByDate[dateKey][domain] = (usageByDate[dateKey][domain] || 0) + seconds;
    }
    cursor = segmentEnd;
  }

  const todayUsage = usageByDate[todayKey()] || {};
  await storageSet("local", {
    usageByDate: pruneDateMap(usageByDate),
    usageData: todayUsage
  });

  return todayUsage[domain] || 0;
}

async function tickActiveSession(nowMs = Date.now()) {
  if (!(await isExtensionEnabled())) {
    await storageSet("local", { trackingState: null });
    return null;
  }

  const data = await storageGet("local", ["trackingState"]);
  const state = data.trackingState;
  if (!state || !state.domain) return null;

  const startMs = Number(state.lastTickAt || state.startedAt || nowMs);
  const totalSeconds = await addUsageForRange(state.domain, startMs, nowMs);
  const updatedState = { ...state, lastTickAt: nowMs };

  await storageSet("local", { trackingState: updatedState });
  await checkLimitAndNotify(state.domain, totalSeconds, state.tabId);
  return updatedState;
}

async function setActiveTracking(target, tabId) {
  if (!(await isExtensionEnabled())) {
    await storageSet("local", { trackingState: null });
    return;
  }

  const nowMs = Date.now();
  const data = await storageGet("local", ["trackingState"]);
  const state = data.trackingState;
  const domain = target ? target.domain : null;

  if (state && state.domain === domain && state.tabId === tabId) {
    return;
  }

  if (state && state.domain) {
    await tickActiveSession(nowMs);
  }

  if (!domain) {
    await storageSet("local", { trackingState: null });
    return;
  }

  await storageSet("local", {
    trackingState: {
      domain,
      tabId,
      startedAt: nowMs,
      lastTickAt: nowMs
    }
  });
}

async function setActiveFromTab(tab) {
  await setActiveTracking(getTrackingTargetFromTab(tab), tab && tab.id);
}

async function refreshActiveTab() {
  const tab = await getActiveTab();
  await setActiveFromTab(tab);
}

async function getDismissedForToday() {
  const data = await storageGet("local", ["dismissedLimitsByDate"]);
  const dismissedLimitsByDate = data.dismissedLimitsByDate || {};
  return dismissedLimitsByDate[todayKey()] || {};
}

function buildLimitPageUrl(domain, totalSeconds, limitMinutes) {
  const params = new URLSearchParams({
    domain,
    used: String(Math.floor(totalSeconds || 0)),
    limit: String(limitMinutes)
  });
  return api.runtime.getURL(`limit/limit.html?${params.toString()}`);
}

function isLimitPageUrl(url) {
  try {
    return Boolean(url && url.startsWith(api.runtime.getURL("limit/limit.html")));
  } catch (error) {
    return false;
  }
}

async function openLimitPage(tabId, domain, totalSeconds, limitMinutes) {
  if (tabId === undefined || tabId === null) return false;

  const tab = await apiCall(api.tabs, "get", tabId);
  if (!tab || isLimitPageUrl(tab.url) || !tab.url || !tab.url.startsWith("http")) {
    return false;
  }

  await apiCall(api.tabs, "update", tabId, {
    url: buildLimitPageUrl(domain, totalSeconds, limitMinutes)
  });
  return true;
}

async function checkLimitAndNotify(domain, knownTotalSeconds, tabId) {
  const [settingsData, limitData] = await Promise.all([
    storageGet("sync", ["settings"]),
    storageGet("local", ["limits"])
  ]);
  if ((settingsData.settings || {}).enabled === false) return;

  const limits = limitData.limits || {};
  const limitMinutes = limits[domain];
  if (!limitMinutes) return;

  let totalSeconds = knownTotalSeconds;
  if (totalSeconds === undefined) {
    const usageData = await storageGet("local", ["usageByDate"]);
    totalSeconds = ((usageData.usageByDate || {})[todayKey()] || {})[domain] || 0;
  }

  if (totalSeconds < limitMinutes * 60) return;

  const dismissed = await getDismissedForToday();
  if (dismissed[domain]) return;

  const supportedEntry = getSiteEntryForDomain(domain);
  let notifiedSupportedTabs = false;

  if (supportedEntry) {
    const patterns = typeof dfwGetSiteHostPatterns === "function"
      ? dfwGetSiteHostPatterns(domain)
      : [`*://*.${domain}/*`, `*://${domain}/*`];
    const tabsById = {};

    for (const pattern of patterns) {
      const tabs = await apiCall(api.tabs, "query", { url: pattern });
      if (Array.isArray(tabs)) {
        tabs.forEach((tab) => {
          if (tab && tab.id !== undefined) tabsById[tab.id] = tab;
        });
      }
    }

    Object.keys(tabsById).forEach((matchedTabId) => {
      notifiedSupportedTabs = true;
      apiCall(api.tabs, "sendMessage", Number(matchedTabId), {
        action: "LIMIT_REACHED",
        domain,
        usedSeconds: totalSeconds,
        limitMinutes
      });
    });
  }

  if (!notifiedSupportedTabs) {
    await openLimitPage(tabId, domain, totalSeconds, limitMinutes);
  }
}

async function dismissLimitForToday(domain) {
  const data = await storageGet("local", ["dismissedLimitsByDate"]);
  const dismissedLimitsByDate = data.dismissedLimitsByDate || {};
  const today = todayKey();
  dismissedLimitsByDate[today] = dismissedLimitsByDate[today] || {};
  dismissedLimitsByDate[today][domain] = true;

  await storageSet("local", { dismissedLimitsByDate });
}

async function runDailyMaintenance() {
  await migrateLegacyUsage();
  await migrateLimitsToLocal();

  const today = todayKey();
  const data = await storageGet("local", ["currentDate", "usageByDate", "dismissedLimitsByDate"]);
  const update = {
    usageByDate: pruneDateMap(data.usageByDate || {}),
    usageData: ((data.usageByDate || {})[today] || {})
  };

  if (data.currentDate !== today) {
    update.currentDate = today;
    update.dismissedLimitsByDate = { [today]: ((data.dismissedLimitsByDate || {})[today] || {}) };
  }

  await storageSet("local", update);
  await storageRemove("local", "pageUsageByDate");
}

function createTrackingAlarms() {
  try {
    api.alarms.create(TRACKING_ALARM, {
      delayInMinutes: TRACKING_INTERVAL_MINUTES,
      periodInMinutes: TRACKING_INTERVAL_MINUTES
    });
    api.alarms.create(DAILY_ALARM, {
      delayInMinutes: 1,
      periodInMinutes: 60
    });
  } catch (error) {}
}

api.tabs.onActivated.addListener((info) => {
  apiCall(api.tabs, "get", info.tabId).then(setActiveFromTab);
});

api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab && tab.active && (changeInfo.url || changeInfo.status === "complete")) {
    setActiveFromTab(tab);
  }
});

api.tabs.onRemoved.addListener((tabId) => {
  storageGet("local", ["trackingState"]).then((data) => {
    if (data.trackingState && data.trackingState.tabId === tabId) {
      refreshActiveTab();
    }
  });
});

api.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === api.windows.WINDOW_ID_NONE) {
    setActiveTracking(null, null);
    return;
  }
  refreshActiveTab();
});

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TRACKING_ALARM) {
    tickActiveSession();
  }
  if (alarm.name === DAILY_ALARM) {
    runDailyMaintenance();
  }
});

api.runtime.onInstalled.addListener(() => {
  createTrackingAlarms();
  runDailyMaintenance();
  refreshActiveTab();
});

if (api.runtime.onStartup) {
  api.runtime.onStartup.addListener(() => {
    createTrackingAlarms();
    runDailyMaintenance();
    refreshActiveTab();
  });
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === "DISMISS_LIMIT" && message.domain) {
    dismissLimitForToday(message.domain).then(() => {
      if (typeof sendResponse === "function") sendResponse({ ok: true });
    });
    return true;
  }

  if (message && message.action === "SET_EXTENSION_ENABLED") {
    if (message.enabled === false) {
      setActiveTracking(null, null);
      return;
    }
    refreshActiveTab();
  }
});

createTrackingAlarms();
runDailyMaintenance();
refreshActiveTab();
