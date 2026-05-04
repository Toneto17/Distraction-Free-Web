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
    document.getElementById('sites-container').innerHTML =
      '<p class="error-msg">Failed to load rules.</p>';
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
    header.innerHTML = `
      <div class="accordion-title">
        <span class="site-dot"></span>
        ${site.name}
      </div>
      <div class="accordion-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    `;

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
        row.innerHTML = `
          <span class="feature-title">${f.title}</span>
          <label class="switch">
            <input type="checkbox" data-id="${f.id}">
            <span class="slider"></span>
          </label>
        `;
        inner.appendChild(row);

        const toggle = row.querySelector('input');
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
    lCard.innerHTML = `
      <div class="limit-info">
        <span class="limit-time">Used: ${usedMin}m${limitVal > 0 ? ' / ' + limitVal + 'm' : ''}</span>
      </div>
      ${limitVal > 0 ? `
      <div class="progress-track">
        <div class="progress-bar ${cls}" style="width:${pct}%"></div>
      </div>` : ''}
      <div class="limit-controls">
        <input type="number" class="limit-input" placeholder="0 = off (mins)" value="${limitVal || ''}" min="0">
        <button class="btn-save" data-domain="${domain}">Save</button>
      </div>
    `;

    const saveBtn = lCard.querySelector('.btn-save');
    const input   = lCard.querySelector('.limit-input');

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
