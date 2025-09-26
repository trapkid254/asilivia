// Simple API helper that prefers backend endpoints proxied via Netlify
(function(){
  // Base URL strategy: window.BACKEND_URL (if set) -> '/api'
  function getBaseUrl(){
    const custom = (typeof window !== 'undefined' && window.BACKEND_URL) ? String(window.BACKEND_URL).trim() : '';
    if (custom) return custom.replace(/\/$/, '');
    return '/api';
  }

  function resolvePath(path){
    if (!path) return getBaseUrl();
    // absolute URL passed by caller
    if (/^https?:\/\//i.test(path)) return path;
    // already absolute path under api
    if (path.startsWith('/api/')) return path;
    // otherwise prefix with base
    const base = getBaseUrl();
    return base + '/' + String(path).replace(/^\/+/, '');
  }

  async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 10000) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs + attempt*3000);
      try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(t);
        // Retry on 502/503/504
        if ([502,503,504].includes(resp.status) && attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * (attempt+1)));
          continue;
        }
        return resp;
      } catch (err) {
        clearTimeout(t);
        lastErr = err;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * (attempt+1)));
          continue;
        }
      }
    }
    throw lastErr || new Error('Network error');
  }

  async function getJSON(path, opts={}) {
    const resp = await fetchWithRetry(resolvePath(path), { credentials: 'include', ...(opts||{}) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
  }
  async function postJSON(path, body, opts={}) {
    const resp = await fetchWithRetry(resolvePath(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
  }
  window.api = { getJSON, postJSON, resolvePath, fetchWithRetry };
})();
