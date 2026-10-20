const MAX_ATTEMPTS = 4;

// Transient storage errors (e.g. 402/5xx) would otherwise leave audio blank forever.
export async function fetchAudioWithRetry(url: string, signal: AbortSignal): Promise<Blob> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (err) {
      if (signal.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
