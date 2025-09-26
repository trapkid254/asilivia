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

  // Backend health cache
  let __backendOk = null; // null=unknown, true/false known
  let __backendCheckedAt = 0;
  const HEALTH_TTL_MS = 30000; // 30s cache

  async function checkBackendHealth(force = false) {
    const now = Date.now();
    if (!force && __backendOk !== null && (now - __backendCheckedAt) < HEALTH_TTL_MS) {
      return __backendOk;
    }
    __backendCheckedAt = now;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1500);
      const resp = await fetch(resolvePath('/api/health'), { signal: controller.signal, credentials: 'include' });
      clearTimeout(t);
      __backendOk = !!(resp && resp.ok);
    } catch(_) {
      __backendOk = false;
    }
    return __backendOk;
  }

  async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 10000) {
    // Short-circuit quickly if backend is down (to avoid long spinner)
    try {
      const isApiUrl = /^https?:\/\//i.test(url) || String(url).includes('/api/');
      if (isApiUrl) {
        const ok = await checkBackendHealth(false);
        if (!ok) throw new Error('Backend unavailable');
      }
    } catch (preErr) {
      // Fail fast
      throw preErr;
    }
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
  async function isBackendUp(force=false){ return checkBackendHealth(force); }
  window.api = { getJSON, postJSON, resolvePath, fetchWithRetry, isBackendUp };
})();
