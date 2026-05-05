/* ─── Cross-browser storage helper ─── */
function getStorage() {
  if (typeof browser !== 'undefined' && browser.storage) return browser.storage;
  if (typeof chrome !== 'undefined' && chrome.storage) return chrome.storage;
  return null;
}

function storageGet(keys) {
  const api = getStorage();
  if (!api) return Promise.resolve({});

  // Try sync first, fall back to local
  return new Promise((resolve) => {
    try {
      const result = api.sync.get(keys);
      if (result && typeof result.then === 'function') {
        // Promise-based (Firefox)
        result.then(resolve).catch(() => {
          // sync failed, try local
          api.local.get(keys).then(resolve).catch(() => resolve({}));
        });
      } else {
        // Callback-based (Chrome)
        api.sync.get(keys, (data) => {
          if (chrome.runtime.lastError) {
            api.local.get(keys, (d) => resolve(d || {}));
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
  const api = getStorage();
  if (!api) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const result = api.sync.set(obj);
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(() => {
          api.local.set(obj).then(resolve).catch(resolve);
        });
      } else {
        api.sync.set(obj, () => {
          if (chrome.runtime.lastError) {
            api.local.set(obj, resolve);
          } else {
            resolve();
          }
        });
      }
    } catch (e) {
      resolve();
    }
  });
}

/* ─── Main ─── */
document.addEventListener('DOMContentLoaded', () => {
  // ─── Safety check ───
  if (typeof DISTRACTION_RULES === 'undefined') {
    const errMsg = document.createElement('p');
    errMsg.className = 'error-msg';
    errMsg.textContent = 'Failed to load rules.';
    document.getElementById('sites-container').appendChild(errMsg);
    return;
  }

  // Render immediately with defaults, then update with saved prefs
  renderUI({}, {}, {});

  // Then try loading saved data
  storageGet(['preferences', 'limits', 'usageData']).then((data) => {
    if (data && (data.preferences || data.limits || data.usageData)) {
      renderUI(data.preferences || {}, data.limits || {}, data.usageData || {});
    }
  });
});

function renderUI(prefs, limits, usage) {
  const container = document.getElementById('sites-container');
  container.innerHTML = '';

  for (const [domain, site] of Object.entries(DISTRACTION_RULES)) {

    const accordion = document.createElement('div');
    accordion.className = 'accordion';

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'accordion-header';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'accordion-title';
    const dot = document.createElement('span');
    dot.className = 'site-dot';
    titleDiv.appendChild(dot);
    titleDiv.appendChild(document.createTextNode(site.name));

    const iconDiv = document.createElement('div');
    iconDiv.className = 'accordion-icon';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'm6 9 6 6 6-6');
    svg.appendChild(svgPath);
    iconDiv.appendChild(svg);
    header.appendChild(titleDiv);
    header.appendChild(iconDiv);

    // ── Content ──
    const content = document.createElement('div');
    content.className = 'accordion-content';

    const inner = document.createElement('div');
    inner.className = 'accordion-inner';
    content.appendChild(inner);

    // Rules Section
    if (site.features && site.features.length > 0) {
      const rulesTitle = document.createElement('div');
      rulesTitle.className = 'section-title';
      rulesTitle.textContent = 'Features to Hide';
      inner.appendChild(rulesTitle);

      site.features.forEach(f => {
        const row = document.createElement('div');
        row.className = 'feature-item';
        const featureTitle = document.createElement('span');
        featureTitle.className = 'feature-title';
        featureTitle.textContent = f.title;
        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.dataset.id = f.id;
        const slider = document.createElement('span');
        slider.className = 'slider';
        switchLabel.appendChild(toggle);
        switchLabel.appendChild(slider);
        row.appendChild(featureTitle);
        row.appendChild(switchLabel);
        inner.appendChild(row);
        toggle.checked = prefs[f.id] !== false;
        toggle.addEventListener('change', e => {
          prefs[f.id] = e.target.checked;
          storageSet({ preferences: prefs });
        });
      });
    }

    // Limits Section
    const limitVal = limits[domain] || 0;
    const usedSec  = usage[domain]  || 0;
    const usedMin  = Math.floor(usedSec / 60);
    let pct = 0, cls = '';
    if (limitVal > 0) {
      pct = Math.min((usedMin / limitVal) * 100, 100);
      if (pct > 90) cls = 'danger';
      else if (pct > 75) cls = 'warning';
    }

    const limitsTitle = document.createElement('div');
    limitsTitle.className = 'section-title mt-4';
    limitsTitle.textContent = 'Time Limit';
    inner.appendChild(limitsTitle);

    const lCard = document.createElement('div');
    lCard.className = 'limit-section';
    const limitInfo = document.createElement('div');
    limitInfo.className = 'limit-info';
    const limitTime = document.createElement('span');
    limitTime.className = 'limit-time';
    limitTime.textContent = `Used: ${usedMin}m${limitVal > 0 ? ' / ' + limitVal + 'm' : ''}`;
    limitInfo.appendChild(limitTime);
    lCard.appendChild(limitInfo);

    if (limitVal > 0) {
      const progressTrack = document.createElement('div');
      progressTrack.className = 'progress-track';
      const progressBar = document.createElement('div');
      progressBar.className = cls ? `progress-bar ${cls}` : 'progress-bar';
      progressBar.style.width = `${pct}%`;
      progressTrack.appendChild(progressBar);
      lCard.appendChild(progressTrack);
    }

    const limitControls = document.createElement('div');
    limitControls.className = 'limit-controls';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'limit-input';
    input.placeholder = '0 = off (mins)';
    if (limitVal) input.value = limitVal;
    input.min = '0';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.dataset.domain = domain;
    saveBtn.textContent = 'Save';
    limitControls.appendChild(input);
    limitControls.appendChild(saveBtn);
    lCard.appendChild(limitControls);

    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = parseInt(input.value) || 0;
      if (v > 0) limits[domain] = v;
      else delete limits[domain];
      storageSet({ limits }).then(() => {
        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('saved');
        setTimeout(() => {
          saveBtn.textContent = 'Save';
          saveBtn.classList.remove('saved');
        }, 1200);
      });
    });

    input.addEventListener('click', e => e.stopPropagation());

    inner.appendChild(lCard);
    accordion.appendChild(header);
    accordion.appendChild(content);

    // Toggle logic
    header.addEventListener('click', () => {
      const isOpen = accordion.classList.contains('open');
      document.querySelectorAll('.accordion').forEach(acc => acc.classList.remove('open'));
      if (!isOpen) {
        accordion.classList.add('open');
        setTimeout(() => {
          accordion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      }
    });

    container.appendChild(accordion);
  }
}
