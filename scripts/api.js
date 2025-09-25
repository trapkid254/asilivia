// Simple API helper that prefers backend endpoints proxied via Netlify
(function(){
  function resolvePath(path){
    if (!path) return '/api';
    // absolute URL
    if (/^https?:\/\//i.test(path)) return path;
    // already absolute path
    if (path.startsWith('/')) return path;
    // otherwise prefix with /api/
    return '/api/' + String(path).replace(/^\/+/, '');
  }

  async function getJSON(path) {
    const resp = await fetch(resolvePath(path), { credentials: 'include' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
  }
  async function postJSON(path, body) {
    const resp = await fetch(resolvePath(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
  }
  window.api = { getJSON, postJSON };
})();
