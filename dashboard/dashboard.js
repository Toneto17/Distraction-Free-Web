const api = typeof browser !== "undefined" ? browser : chrome;
const usesPromiseApi = typeof browser !== "undefined";
const UI_LOCALE = "en-US";
const COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#60a5fa", "#14b8a6", "#f97316"];

let selectedDays = 7;
let cachedData = {
  usageByDate: {},
  pageUsageByDate: {}
};

function storageGet(areaName, keys) {
  const area = api.storage && api.storage[areaName];
  if (!area) return Promise.resolve({});

  if (usesPromiseApi) {
    return area.get(keys).catch(() => ({}));
  }

  return new Promise((resolve) => {
    try {
      area.get(keys, data => resolve(data || {}));
    } catch (error) {
      resolve({});
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

function dateRange(days) {
  const today = new Date();
  const dates = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = addDays(today, -index);
    dates.push({
      key: todayKey(date),
      date
    });
  }
  return dates;
}

function formatMinutes(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function siteName(domain) {
  return DISTRACTION_RULES[domain] ? DISTRACTION_RULES[domain].name : domain;
}

function sumDomainUsage(usageByDate, days) {
  const totals = {};
  dateRange(days).forEach(({ key }) => {
    const usage = usageByDate[key] || {};
    Object.entries(usage).forEach(([domain, seconds]) => {
      totals[domain] = (totals[domain] || 0) + Number(seconds || 0);
    });
  });
  return totals;
}

function sumPageUsage(pageUsageByDate, days) {
  const totals = {};
  dateRange(days).forEach(({ key }) => {
    const pages = pageUsageByDate[key] || {};
    Object.values(pages).forEach((page) => {
      if (!page || !page.id) return;
      totals[page.id] = totals[page.id] || {
        id: page.id,
        domain: page.domain,
        path: page.path,
        label: page.label,
        title: page.title,
        seconds: 0
      };
      totals[page.id].seconds += Number(page.seconds || 0);
      totals[page.id].title = page.title || totals[page.id].title;
    });
  });
  return totals;
}

function dayTotal(usageByDate, key) {
  return Object.values(usageByDate[key] || {}).reduce((sum, seconds) => sum + Number(seconds || 0), 0);
}

function rankedEntries(map, limit = 6) {
  return Object.entries(map)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, limit);
}

function rankedPages(map, limit = 7) {
  return Object.values(map)
    .sort((a, b) => Number(b.seconds || 0) - Number(a.seconds || 0))
    .slice(0, limit);
}

function renderMetrics(domainTotals, usageByDate, days) {
  const totalSeconds = Object.values(domainTotals).reduce((sum, seconds) => sum + Number(seconds || 0), 0);
  const dailyAverage = Math.round(totalSeconds / Math.max(1, days));
  const dayEntries = dateRange(days).map(({ key, date }) => ({
    key,
    date,
    total: dayTotal(usageByDate, key)
  }));
  const bestDay = dayEntries.sort((a, b) => b.total - a.total)[0];
  const top = rankedEntries(domainTotals, 1)[0];

  document.getElementById("total-time").textContent = formatMinutes(totalSeconds);
  document.getElementById("daily-average-label").textContent = `Average (${days}d)`;
  document.getElementById("daily-average").textContent = formatMinutes(dailyAverage);
  document.getElementById("most-active-day").textContent = bestDay && bestDay.total > 0
    ? `${bestDay.date.toLocaleDateString(UI_LOCALE, { weekday: "short" })} ${formatMinutes(bestDay.total)}`
    : "None";
  document.getElementById("top-site").textContent = top ? siteName(top[0]) : "None";
}

function renderHeatmap(usageByDate) {
  const container = document.getElementById("heatmap");
  container.replaceChildren();

  const days = dateRange(84);
  const totals = days.map(({ key }) => dayTotal(usageByDate, key));
  const max = Math.max(1, ...totals);

  days.forEach(({ key, date }, index) => {
    const seconds = totals[index];
    const cell = createElement("span", "heat-cell");
    const level = seconds === 0 ? 0 : Math.min(4, Math.ceil((seconds / max) * 4));
    cell.dataset.level = String(level);
    cell.title = `${date.toLocaleDateString(UI_LOCALE)}: ${formatMinutes(seconds)}`;
    cell.setAttribute("aria-label", cell.title);
    container.appendChild(cell);
  });
}

function renderPie(domainTotals) {
  const chart = document.getElementById("pie-chart");
  const legend = document.getElementById("pie-legend");
  legend.replaceChildren();

  const entries = rankedEntries(domainTotals, 6).filter(([, seconds]) => seconds > 0);
  const total = entries.reduce((sum, [, seconds]) => sum + Number(seconds || 0), 0);

  if (!total) {
    chart.style.background = "#252b32";
    legend.appendChild(createElement("div", "empty", "No usage in this range."));
    return;
  }

  let cursor = 0;
  const segments = entries.map(([domain, seconds], index) => {
    const start = cursor;
    const degrees = (seconds / total) * 360;
    cursor += degrees;
    return `${COLORS[index % COLORS.length]} ${start}deg ${cursor}deg`;
  });
  chart.style.background = `conic-gradient(${segments.join(", ")})`;

  entries.forEach(([domain, seconds], index) => {
    const row = createElement("div", "legend-row");
    const swatch = createElement("span", "legend-swatch");
    swatch.style.background = COLORS[index % COLORS.length];
    row.appendChild(swatch);
    row.appendChild(createElement("span", "", siteName(domain)));
    row.appendChild(createElement("strong", "", formatMinutes(seconds)));
    legend.appendChild(row);
  });
}

function renderDailyBars(usageByDate, days) {
  const container = document.getElementById("daily-bars");
  container.replaceChildren();

  const range = dateRange(days);
  const totals = range.map(({ key }) => dayTotal(usageByDate, key));
  const totalSeconds = totals.reduce((sum, seconds) => sum + seconds, 0);
  const averageSeconds = Math.round(totalSeconds / Math.max(1, days));
  const max = Math.max(1, averageSeconds, ...totals);
  const columns = `repeat(${days}, minmax(14px, 1fr))`;
  const plot = createElement("div", "daily-bar-plot");
  const labels = createElement("div", "daily-label-grid");
  const averageLine = createElement("div", "average-line");
  const averageRatio = max > 0 ? Math.min(1, averageSeconds / max) : 0;

  plot.style.gridTemplateColumns = columns;
  labels.style.gridTemplateColumns = columns;
  averageLine.style.bottom = `${averageRatio * 100}%`;
  averageLine.appendChild(createElement("span", "average-line-label", `Avg ${formatMinutes(averageSeconds)}/day`));
  plot.appendChild(averageLine);

  range.forEach(({ date }, index) => {
    const total = totals[index];
    const item = createElement("div", "bar-item");
    const bar = createElement("div", "bar");
    const label = createElement("span", "bar-label", date.toLocaleDateString(UI_LOCALE, { weekday: "narrow" }));
    bar.style.height = total > 0 ? `${Math.max(2, Math.round((total / max) * 100))}%` : "4px";
    bar.title = `${date.toLocaleDateString(UI_LOCALE)}: ${formatMinutes(total)}`;
    item.appendChild(bar);
    plot.appendChild(item);
    labels.appendChild(label);
  });

  container.appendChild(plot);
  container.appendChild(labels);
}

function renderTopSites(domainTotals) {
  const container = document.getElementById("top-sites-list");
  container.replaceChildren();

  const entries = rankedEntries(domainTotals, 7).filter(([, seconds]) => seconds > 0);
  if (!entries.length) {
    container.appendChild(createElement("div", "empty", "No site usage yet."));
    return;
  }

  entries.forEach(([domain, seconds]) => {
    const row = createElement("div", "rank-row");
    const text = createElement("div");
    text.appendChild(createElement("div", "rank-title", siteName(domain)));
    text.appendChild(createElement("div", "rank-subtitle", domain));
    row.appendChild(text);
    row.appendChild(createElement("div", "rank-time", formatMinutes(seconds)));
    container.appendChild(row);
  });
}

function renderTopPages(pageTotals) {
  const container = document.getElementById("top-pages-list");
  container.replaceChildren();

  const entries = rankedPages(pageTotals, 7).filter(page => page.seconds > 0);
  if (!entries.length) {
    container.appendChild(createElement("div", "empty", "Open web pages to collect page-level insights."));
    return;
  }

  entries.forEach((page) => {
    const row = createElement("div", "rank-row");
    const text = createElement("div");
    text.appendChild(createElement("div", "rank-title", page.label || page.id));
    text.appendChild(createElement("div", "rank-subtitle", siteName(page.domain)));
    row.appendChild(text);
    row.appendChild(createElement("div", "rank-time", formatMinutes(page.seconds)));
    container.appendChild(row);
  });
}

function renderInsights(domainTotals, pageTotals, usageByDate, days) {
  const container = document.getElementById("insights-list");
  container.replaceChildren();

  const insights = [];
  const ranked = rankedEntries(domainTotals, 2);
  const totalSeconds = Object.values(domainTotals).reduce((sum, seconds) => sum + Number(seconds || 0), 0);
  const range = dateRange(days).map(({ key, date }) => ({ key, date, total: dayTotal(usageByDate, key) }));
  const activeDays = range.filter(day => day.total > 0).length;
  const bestDay = [...range].sort((a, b) => b.total - a.total)[0];
  const pages = rankedPages(pageTotals, 1);

  if (ranked[0] && totalSeconds > 0) {
    const share = Math.round((ranked[0][1] / totalSeconds) * 100);
    insights.push(`${siteName(ranked[0][0])} is your main focus sink in this range at ${share}% of tracked time.`);
  }

  if (ranked[0] && ranked[1]) {
    const gap = ranked[0][1] - ranked[1][1];
    if (gap > 0) {
      insights.push(`${siteName(ranked[0][0])} is ahead of ${siteName(ranked[1][0])} by ${formatMinutes(gap)}.`);
    }
  }

  if (bestDay && bestDay.total > 0) {
    insights.push(`Your heaviest day was ${bestDay.date.toLocaleDateString(UI_LOCALE, { weekday: "long" })} with ${formatMinutes(bestDay.total)} tracked.`);
  }

  if (activeDays > 0) {
    insights.push(`You used tracked sites on ${activeDays} of the last ${days} days.`);
  }

  if (pages[0]) {
    insights.push(`Most repeated page group: ${pages[0].label || pages[0].id} (${formatMinutes(pages[0].seconds)}).`);
  }

  if (!insights.length) {
    insights.push("No patterns yet. Browse supported sites for a bit and come back.");
  }

  insights.slice(0, 5).forEach((text) => {
    container.appendChild(createElement("div", "insight-row", text));
  });
}

function renderDashboard() {
  const domainTotals = sumDomainUsage(cachedData.usageByDate, selectedDays);
  const pageTotals = sumPageUsage(cachedData.pageUsageByDate, selectedDays);

  renderMetrics(domainTotals, cachedData.usageByDate, selectedDays);
  renderHeatmap(cachedData.usageByDate);
  renderPie(domainTotals);
  renderDailyBars(cachedData.usageByDate, selectedDays);
  renderTopSites(domainTotals);
  renderTopPages(pageTotals);
  renderInsights(domainTotals, pageTotals, cachedData.usageByDate, selectedDays);

  const totalSeconds = Object.values(domainTotals).reduce((sum, seconds) => sum + Number(seconds || 0), 0);
  const dailyAverage = Math.round(totalSeconds / Math.max(1, selectedDays));
  document.getElementById("bars-caption").textContent = `Last ${selectedDays} days • Average ${formatMinutes(dailyAverage)}/day`;
}

function setRange(days) {
  selectedDays = days;
  document.querySelectorAll(".range-btn").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.days) === days);
  });
  renderDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".range-btn").forEach((button) => {
    button.addEventListener("click", () => setRange(Number(button.dataset.days)));
  });

  storageGet("local", ["usageByDate", "pageUsageByDate", "usageData"]).then((data) => {
    const today = todayKey();
    cachedData = {
      usageByDate: data.usageByDate || (data.usageData ? { [today]: data.usageData } : {}),
      pageUsageByDate: data.pageUsageByDate || {}
    };
    renderDashboard();
  });
});
