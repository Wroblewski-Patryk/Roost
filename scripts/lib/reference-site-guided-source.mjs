import { verifyGuidedPackages } from './reference-site-guided-findings.mjs';

const fail = reason => { throw Object.assign(new Error(`guided_source_${reason}`), { reason }); };

export async function fetchGuidedPackages({ baseUrl, apiKey, pins, timeoutMs = 15000 }) {
  let origin;
  try {
    origin = new URL(baseUrl);
  } catch { fail('url_invalid'); }
  if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === '127.0.0.1'))
    || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
    || typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 4096
    || !Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) fail('configuration_invalid');
  if (!pins || !Array.isArray(pins.sites) || pins.sites.length !== 2) fail('pins_invalid');
  const responses = [];
  for (const site of pins.sites) {
    const url = new URL(`/v1/product-engineering/tasks/${encodeURIComponent(pins.taskId)}/reference-sites/${encodeURIComponent(site.siteId)}/package`, origin);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal,
        headers: { Accept: 'application/json', 'X-API-Key': apiKey } });
      if (result.status !== 200 || result.redirected || result.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') fail('response_invalid');
      const length = Number(result.headers.get('content-length'));
      if (Number.isFinite(length) && length > 524288) fail('response_oversize');
      const raw = await result.text();
      if (Buffer.byteLength(raw, 'utf8') > 524288) fail('response_oversize');
      let body;
      try { body = JSON.parse(raw); } catch { fail('response_json_invalid'); }
      responses.push(body?.data);
    } finally { clearTimeout(timer); }
  }
  return verifyGuidedPackages(pins, responses);
}
