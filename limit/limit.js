const api = typeof browser !== "undefined" ? browser : chrome;

function formatMinutes(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function sendRuntimeMessage(message) {
  try {
    const result = api.runtime.sendMessage(message);
    if (result && typeof result.catch === "function") {
      return result.catch(() => {});
    }
  } catch (error) {}
  return Promise.resolve();
}

function leaveLimitPage() {
  if (history.length > 1) {
    history.back();
    return;
  }

  window.close();
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("domain") || "this site";
  const usedSeconds = Number(params.get("used") || 0);
  const limitMinutes = Number(params.get("limit") || 0);

  document.getElementById("domain").textContent = domain;
  document.getElementById("used-time").textContent = formatMinutes(usedSeconds);
  document.getElementById("limit-time").textContent = `${limitMinutes}m`;

  document.getElementById("skip-today-btn").addEventListener("click", () => {
    sendRuntimeMessage({ action: "DISMISS_LIMIT", domain }).then(leaveLimitPage);
  });
});
