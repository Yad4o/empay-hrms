const BASE = '/api/v1';

const api = {
  _token: () => localStorage.getItem('empay_token'),

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this._token();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body !== null) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/index.html';
      return;
    }

    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = data?.detail || (typeof data === 'string' ? data : 'Request failed');
      throw new Error(msg);
    }
    return data;
  },

  get:    (path)       => api.request('GET',    path),
  post:   (path, body) => api.request('POST',   path, body),
  put:    (path, body) => api.request('PUT',    path, body),
  delete: (path)       => api.request('DELETE', path),
};
