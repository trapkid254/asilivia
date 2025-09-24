// Simple API helper that prefers backend endpoints proxied via Netlify
(function(){
  async function getJSON(path) {
    const resp = await fetch(path, { credentials: 'include' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
  }
  async function postJSON(path, body) {
    const resp = await fetch(path, {
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
