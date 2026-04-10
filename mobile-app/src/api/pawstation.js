const DEFAULT_PORT = 8080;

export class PawStationApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PawStationApiError';
  }
}

function normalizeBaseUrl(piIp) {
  const trimmed = String(piIp || '').trim();
  if (!trimmed) {
    throw new PawStationApiError('Enter the Raspberry Pi IP address first.');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/$/, '');
  }

  return `http://${trimmed}:${DEFAULT_PORT}`;
}

async function request(piIp, endpoint, options = {}) {
  const baseUrl = normalizeBaseUrl(piIp);
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let details = `${response.status} ${response.statusText}`;
    try {
      const text = await response.text();
      if (text) {
        details = `${details} - ${text}`;
      }
    } catch {
      // ignore body parsing failures here
    }
    throw new PawStationApiError(`Request failed: ${details}`);
  }

  const text = await response.text();
  if (!text) {
    return { ok: true };
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new PawStationApiError('Device returned invalid JSON.');
  }
}

export async function getStatus(piIp) {
  return request(piIp, '/status');
}

export async function getDaily(piIp) {
  return request(piIp, '/daily');
}

export async function updateSettings(piIp, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new PawStationApiError('No settings were provided.');
  }

  return request(piIp, '/settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function dispenseNow(piIp) {
  return request(piIp, '/dispense', {
    method: 'POST',
  });
}
