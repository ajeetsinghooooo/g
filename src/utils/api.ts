/**
 * Robust API Fetch and JSON parsing helpers.
 * Handles server warm-up, dev server restarts, and proxy HTML fallback transparently.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch wrapper that detects Nginx / dev-server warmup HTML responses (HTTP 200 with <!doctype)
 * and automatically retries with backoff until the API server is ready.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(input, init);
      const contentType = res.headers.get('content-type') || '';

      // If response is JSON, it's valid
      if (contentType.includes('application/json')) {
        return res;
      }

      // If it's HTML, it might be the Nginx warmup page (Starting Server...)
      const clone = res.clone();
      const text = await clone.text();
      const isWarmupOrHtml =
        text.includes('Starting Server') ||
        text.includes('<!DOCTYPE') ||
        text.includes('<!doctype') ||
        text.includes('<html');

      if (isWarmupOrHtml && attempt < maxRetries) {
        attempt++;
        const delay = attempt * 800;
        await sleep(delay);
        continue;
      }

      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        await sleep(attempt * 800);
        continue;
      }
      throw err;
    }
  }

  return fetch(input, init);
}

/**
 * Safe JSON parser that guarantees a valid JSON object or a user-friendly error.
 * Never leaks raw JavaScript syntax errors or HTML markup to the UI.
 */
export async function safeJson<T = any>(res: Response, fallbackError = 'Request failed'): Promise<T> {
  const text = await res.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    if (text.includes('<!DOCTYPE') || text.includes('<!doctype') || text.includes('<html')) {
      throw new Error('Service is currently initializing. Please try again in a few moments.');
    }
    throw new Error(text.trim() || `${fallbackError} (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const errorMsg = parsed?.error || parsed?.message || `${fallbackError} (HTTP ${res.status})`;
    const error: any = new Error(errorMsg);
    if (parsed?.code) error.code = parsed.code;
    if (parsed?.missingVariables) error.missingVariables = parsed.missingVariables;
    throw error;
  }

  return parsed as T;
}
