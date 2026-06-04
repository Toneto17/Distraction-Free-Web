const extApi = typeof browser !== "undefined" ? browser : chrome;
const usesPromiseApi = typeof browser !== "undefined";
const UI_LOCALE = "en-US";

function storageGet(areaName, keys) {
  const area = extApi.storage && extApi.storage[areaName];
  if (!area) return Promise.resolve({});

  if (usesPromiseApi) {
    return area.get(keys).catch(() => {
      if (areaName === "sync" && extApi.storage.local) {
        return extApi.storage.local.get(keys).catch(() => ({}));
      }
      return {};
    });
  }

  return new Promise((resolve) => {
    try {
      area.get(keys, (data) => {
        if (extApi.runtime.lastError && areaName === "sync" && extApi.storage.local) {
          extApi.storage.local.get(keys, (localData) => resolve(localData || {}));
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
  const area = extApi.storage && extApi.storage[areaName];
  if (!area) return Promise.resolve();

  if (usesPromiseApi) {
    return area.set(obj).catch(() => {
      if (areaName === "sync" && extApi.storage.local) {
        return extApi.storage.local.set(obj).catch(() => {});
      }
    });
  }

  return new Promise((resolve) => {
    try {
      area.set(obj, () => {
        if (extApi.runtime.lastError && areaName === "sync" && extApi.storage.local) {
          extApi.storage.local.set(obj, () => resolve());
          return;
        }
        resolve();
      });
    } catch (error) {
      resolve();
    }
  });
}

function tabsQuery(queryInfo) {
  if (usesPromiseApi) {
    return extApi.tabs.query(queryInfo).catch(() => []);
  }

  return new Promise((resolve) => {
    try {
      extApi.tabs.query(queryInfo, (tabs) => resolve(tabs || []));
    } catch (error) {
      resolve([]);
    }
  });
}

function tabsReload(tabId) {
  if (tabId === undefined) return Promise.resolve();

  if (usesPromiseApi) {
    return extApi.tabs.reload(tabId).catch(() => {});
  }

  return new Promise((resolve) => {
    try {
      extApi.tabs.reload(tabId, () => resolve());
    } catch (error) {
      resolve();
    }
  });
}

function tabsCreate(createProperties) {
  if (usesPromiseApi) {
    return extApi.tabs.create(createProperties).catch(() => undefined);
  }

  return new Promise((resolve) => {
    try {
      extApi.tabs.create(createProperties, tab => resolve(tab));
    } catch (error) {
      resolve(undefined);
    }
  });
}

function runtimeSendMessage(message) {
  try {
    const result = extApi.runtime.sendMessage(message);
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch (error) {}
}

function tabsSendMessage(tabId, message) {
  if (tabId === undefined) return Promise.resolve();

  if (usesPromiseApi) {
    return extApi.tabs.sendMessage(tabId, message).catch(() => {});
  }

  return new Promise((resolve) => {
    try {
      extApi.tabs.sendMessage(tabId, message, () => resolve());
    } catch (error) {
      resolve();
    }
  });
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatMinutes(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function getTodayUsage(localData, syncData) {
  const usageByDate = localData.usageByDate || {};
  const todayUsage = usageByDate[todayKey()] || {};
  if (Object.keys(todayUsage).length > 0) return todayUsage;
  return localData.usageData || syncData.usageData || {};
}

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function siteName(domain) {
  return DISTRACTION_RULES[domain] ? DISTRACTION_RULES[domain].name : domain;
}

function normalizeTrackedDomain(hostname) {
  if (typeof dfwNormalizeTrackedDomain === "function") {
    return dfwNormalizeTrackedDomain(hostname);
  }

  return String(hostname || "")
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^(www|m|mobile)\./, "");
}

function domainFromUrl(url) {
  try {
    if (!url || !url.startsWith("http")) return null;
    const hostname = new URL(url).hostname;
    const entry = typeof dfwGetSiteEntryForHost === "function"
      ? dfwGetSiteEntryForHost(hostname)
      : null;
    return entry ? entry.domain : normalizeTrackedDomain(hostname);
  } catch (error) {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof DISTRACTION_RULES === "undefined") {
    const errMsg = createElement("p", "error-msg", "Failed to load rules.");
    document.getElementById("sites-container").appendChild(errMsg);
    return;
  }

  const reloadBtn = document.getElementById("reload-page-btn");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", reloadCurrentTab);
  }

  const dashboardBtn = document.getElementById("open-dashboard-btn");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", openDashboard);
  }

  const powerBtn = document.getElementById("power-toggle-btn");
  if (powerBtn) {
    powerBtn.addEventListener("click", toggleExtensionEnabled);
  }

  loadStoredData();
});

function loadStoredData() {
  Promise.all([
    storageGet("sync", ["preferences", "settings", "usageData"]),
    storageGet("local", ["usageByDate", "usageData", "limits"])
  ]).then(([syncData, localData]) => {
    renderUI(
      syncData.preferences || {},
      localData.limits || {},
      localData || {},
      syncData || {},
      syncData.settings || {}
    );
  });
}

async function reloadCurrentTab() {
  const button = document.getElementById("reload-page-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Reloading";
  }

  const tabs = await tabsQuery({ active: true, currentWindow: true });
  if (tabs[0]) {
    await tabsReload(tabs[0].id);
  }

  if (button) {
    button.textContent = tabs[0] ? "Reloaded" : "No Tab";
    setTimeout(() => {
      button.disabled = false;
      button.textContent = "Reload Page";
    }, 1200);
  }
}

async function openDashboard() {
  const tabs = await tabsQuery({ active: true, currentWindow: true });
  const domain = tabs[0] ? domainFromUrl(tabs[0].url) : null;
  const url = new URL(extApi.runtime.getURL("dashboard/dashboard.html"));
  if (domain) url.searchParams.set("domain", domain);
  tabsCreate({ url: url.toString() });
}

async function toggleExtensionEnabled() {
  const syncData = await storageGet("sync", ["settings"]);
  const settings = syncData.settings || {};
  const nextSettings = { ...settings, enabled: settings.enabled === false };
  await storageSet("sync", { settings: nextSettings });

  renderPowerState(nextSettings);
  runtimeSendMessage({
    action: "SET_EXTENSION_ENABLED",
    enabled: nextSettings.enabled !== false
  });

  const tabs = await tabsQuery({ active: true, currentWindow: true });
  if (tabs[0]) {
    await tabsSendMessage(tabs[0].id, {
      action: "EXTENSION_STATE_CHANGED",
      enabled: nextSettings.enabled !== false
    });
  }

  loadStoredData();
}

function renderPowerState(settings) {
  const isEnabled = settings.enabled !== false;
  const button = document.getElementById("power-toggle-btn");
  document.body.classList.toggle("extension-disabled", !isEnabled);

  if (!button) return;
  button.textContent = isEnabled ? "On" : "Off";
  button.setAttribute("aria-pressed", String(isEnabled));
  button.title = isEnabled ? "Turn extension off" : "Turn extension on";
}

function renderUI(prefs, limits, localData, syncData, settings = {}) {
  renderPowerState(settings);
  const usage = getTodayUsage(localData, syncData);
  renderOverview(usage, limits, localData.usageByDate || {}, settings);
  renderSites(prefs);
}

function renderOverview(usage, limits, usageByDate, settings) {
  const container = document.getElementById("overview-container");
  container.innerHTML = "";

  const trackedDomains = Object.keys(usage || {}).filter(domain => usage[domain] > 0);
  const totalSeconds = trackedDomains.reduce((total, domain) => total + (usage[domain] || 0), 0);
  const activeLimits = Object.keys(limits || {}).filter(domain => limits[domain] > 0).length;
  const supportedSites = Object.keys(DISTRACTION_RULES).length;

  const card = createElement("div", "overview-card");
  const header = createElement("div", "overview-header");
  header.appendChild(createElement("span", "section-title overview-title", "Today"));
  header.appendChild(createElement("span", "overview-total", formatMinutes(totalSeconds)));
  card.appendChild(header);

  if (settings.enabled === false) {
    card.appendChild(createElement("div", "disabled-note", "Extension is off. Rules and time limits are paused."));
  }

  const stats = createElement("div", "overview-stats");
  stats.appendChild(createStat("Tracked", String(trackedDomains.length)));
  stats.appendChild(createStat("Limits", String(activeLimits)));
  stats.appendChild(createStat("Rules", String(supportedSites)));
  card.appendChild(stats);

  const topList = createElement("div", "top-sites");
  const topEntries = trackedDomains
    .map(domain => [domain, usage[domain] || 0])
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topEntries.length === 0) {
    topList.appendChild(createElement("div", "empty-state", "No tracked time today."));
  } else {
    const maxSeconds = Math.max(...topEntries.map(([, seconds]) => seconds));
    topEntries.forEach(([domain, seconds]) => {
      topList.appendChild(createUsageRow(domain, seconds, maxSeconds));
    });
  }
  card.appendChild(topList);

  card.appendChild(createWeekStrip(usageByDate));
  container.appendChild(card);
}

function createStat(label, value) {
  const stat = createElement("div", "overview-stat");
  stat.appendChild(createElement("span", "overview-stat-value", value));
  stat.appendChild(createElement("span", "overview-stat-label", label));
  return stat;
}

function createUsageRow(domain, seconds, maxSeconds) {
  const row = createElement("div", "usage-row");
  const info = createElement("div", "usage-row-info");
  info.appendChild(createElement("span", "usage-site", siteName(domain)));
  info.appendChild(createElement("span", "usage-time", formatMinutes(seconds)));

  const track = createElement("div", "usage-bar-track");
  const bar = createElement("div", "usage-bar");
  bar.style.width = `${Math.max(8, Math.round((seconds / maxSeconds) * 100))}%`;
  track.appendChild(bar);

  row.appendChild(info);
  row.appendChild(track);
  return row;
}

function createWeekStrip(usageByDate) {
  const strip = createElement("div", "week-strip");
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const key = todayKey(date);
    const dayUsage = usageByDate[key] || {};
    const total = Object.values(dayUsage).reduce((sum, seconds) => sum + Number(seconds || 0), 0);
    days.push({ key, label: date.toLocaleDateString(UI_LOCALE, { weekday: "narrow" }), total });
  }

  const maxTotal = Math.max(1, ...days.map(day => day.total));
  days.forEach((day) => {
    const item = createElement("div", "week-day");
    const bar = createElement("span", "week-day-bar");
    bar.style.height = `${Math.max(4, Math.round((day.total / maxTotal) * 32))}px`;
    item.appendChild(bar);
    item.appendChild(createElement("span", "week-day-label", day.label));
    strip.appendChild(item);
  });

  return strip;
}

function renderSites(prefs) {
  const container = document.getElementById("sites-container");
  container.innerHTML = "";

  for (const [domain, site] of Object.entries(DISTRACTION_RULES)) {
    const accordion = createElement("div", "accordion");
    const header = createSiteHeader(site);
    const content = createElement("div", "accordion-content");
    const inner = createElement("div", "accordion-inner");

    renderFeatureGroups(inner, site.features || [], prefs);

    content.appendChild(inner);
    accordion.appendChild(header);
    accordion.appendChild(content);
    header.addEventListener("click", () => toggleAccordion(accordion));
    container.appendChild(accordion);
  }
}

function createSiteHeader(site) {
  const header = createElement("div", "accordion-header");
  const titleDiv = createElement("div", "accordion-title");
  titleDiv.appendChild(createElement("span", "site-dot"));
  titleDiv.appendChild(createElement("span", "", site.name));

  const iconDiv = createElement("div", "accordion-icon");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svgPath.setAttribute("d", "m6 9 6 6 6-6");
  svg.appendChild(svgPath);
  iconDiv.appendChild(svg);

  header.appendChild(titleDiv);
  header.appendChild(iconDiv);
  return header;
}

function renderFeatureGroups(parent, features, prefs) {
  const groups = features.reduce((acc, feature) => {
    const groupName = feature.group || "Features";
    acc[groupName] = acc[groupName] || [];
    acc[groupName].push(feature);
    return acc;
  }, {});

  Object.entries(groups).forEach(([groupName, groupFeatures]) => {
    parent.appendChild(createElement("div", "section-title", groupName));

    groupFeatures.forEach((feature) => {
      const row = createElement("div", "feature-item");
      const featureCopy = createElement("div", "feature-copy");
      const featureTitle = createElement("span", "feature-title", feature.title);
      const switchLabel = createElement("label", "switch");
      const toggle = document.createElement("input");
      const slider = createElement("span", "slider");

      toggle.type = "checkbox";
      toggle.dataset.id = feature.id;
      toggle.checked = dfwIsFeatureEnabled(feature, prefs);

      toggle.addEventListener("change", (event) => {
        prefs[feature.id] = event.target.checked;
        storageSet("sync", { preferences: prefs });
      });

      switchLabel.appendChild(toggle);
      switchLabel.appendChild(slider);
      featureCopy.appendChild(featureTitle);
      if (feature.description) {
        featureCopy.appendChild(createElement("span", "feature-description", feature.description));
      }
      row.appendChild(featureCopy);
      row.appendChild(switchLabel);
      parent.appendChild(row);
    });
  });
}

function toggleAccordion(accordion) {
  const isOpen = accordion.classList.contains("open");
  document.querySelectorAll(".accordion").forEach(acc => acc.classList.remove("open"));
  if (!isOpen) {
    accordion.classList.add("open");
    setTimeout(() => {
      accordion.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 300);
  }
}
