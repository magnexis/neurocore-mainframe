const timeoutMs = 1800;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...options,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    return response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

export const api = {
  health: () => request('/api/health'),
  telemetry: (real = false) => request(`/api/telemetry?real=${real ? 'true' : 'false'}`),
  processes: (real = false) => request(`/api/processes?real=${real ? 'true' : 'false'}`),
  logs: () => request('/api/logs'),
  archive: (query = '') => request(`/api/archive?q=${encodeURIComponent(query)}`),
  adapters: () => request('/api/adapters'),
  session: (payload) =>
    request('/api/session', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  action: (module, action, target = '') =>
    request('/api/action', {
      method: 'POST',
      body: JSON.stringify({ module, action, target }),
    }),
  command: (command) =>
    request('/api/command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),
};
