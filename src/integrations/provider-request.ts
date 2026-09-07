import { IntegrationError } from "./errors";

/** Retry reads only: a timed-out provider write may already have succeeded. */
export async function providerRequest(url: string | URL, init: RequestInit = {}): Promise<Response> {
  const attempts = (init.method ?? "GET") === "GET" ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      if (attempt + 1 < attempts && (response.status === 429 || response.status >= 500)) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const reset = Number(response.headers.get("x-ratelimit-reset"));
        const resetMs = reset > 1e12 ? reset : reset * 1000;
        const rateDelay = retryAfter > 0 ? retryAfter * 1000 : reset > 0 ? resetMs - Date.now() : 60_000;
        const delay = response.status === 429 ? Math.min(60_000, Math.max(250, rateDelay)) : 250 * 2 ** attempt;
        await response.body?.cancel();
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt + 1 === attempts) {
        throw new IntegrationError("integration_unavailable", 502, "Provider request could not be completed. Refresh provider state before retrying a write.");
      }
    }
  }
  throw new IntegrationError("integration_unavailable", 502, "Provider request could not be completed.");
}
