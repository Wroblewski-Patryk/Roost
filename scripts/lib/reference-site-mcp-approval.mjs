import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

function html(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function page(pending) {
  const content = pending ? `<p>Sprawdź całą treść żądania. / Review the complete request.</p>
<p>SHA-256: <code>${html(pending.digest)}</code></p>
<pre>${html(JSON.stringify(JSON.parse(pending.exactRequest), null, 2))}</pre>
<form method="post" action="/decision">
  <input type="hidden" name="nonce" value="${html(pending.nonce)}">
  <input type="hidden" name="csrf" value="${html(pending.csrf)}">
  <label>Wpisz ostatnie 8 znaków skrótu / Type the last 8 digest characters:
    <input name="confirmation" maxlength="8" autocomplete="off" required></label>
  <p><button type="submit" name="decision" value="approve">Zatwierdź dokładnie ten zapis / Approve this exact write</button>
  <button type="submit" name="decision" value="deny" formnovalidate>Odmów / Deny</button></p>
</form>` : "<p>Brak oczekującego zapisu. / No write is awaiting approval.</p>";
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Roost — zgoda na Finding / Finding approval</title>
<style>body{font:16px system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#18212d;background:#fff}
pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #aab4c2;padding:1rem;max-height:55vh;overflow:auto}
button,input{font:inherit;padding:.5rem}button{margin:.5rem .5rem .5rem 0}label{display:block}code{overflow-wrap:anywhere}</style>
<h1>Roost — dokładna zgoda / Exact approval</h1>${content}</html>`;
}

function send(response, status, body, contentType = "text/html; charset=utf-8") {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
  response.end(body);
}

export async function startReferenceSiteApprovalServer() {
  let pending = null;
  let queue = Promise.resolve();
  let origin;
  const server = createServer(async (request, response) => {
    if (request.headers.host !== new URL(origin).host) {
      send(response, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }
    if (request.method === "GET" && request.url === "/") {
      send(response, 200, page(pending));
      return;
    }
    if (request.method !== "POST" || request.url !== "/decision" || request.headers.origin !== origin ||
        !String(request.headers["content-type"] ?? "").startsWith("application/x-www-form-urlencoded")) {
      send(response, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }
    let form = "";
    for await (const chunk of request) {
      form += chunk;
      if (form.length > 1024) {
        send(response, 413, "Too large", "text/plain; charset=utf-8");
        return;
      }
    }
    const fields = new URLSearchParams(form);
    if (!pending || fields.get("nonce") !== pending.nonce || fields.get("csrf") !== pending.csrf) {
      send(response, 409, "No matching approval", "text/plain; charset=utf-8");
      return;
    }
    const decision = fields.get("decision");
    if (decision !== "deny" && (decision !== "approve" ||
        fields.get("confirmation") !== pending.digest.slice(-8))) {
      send(response, 409, "Digest confirmation does not match", "text/plain; charset=utf-8");
      return;
    }
    const current = pending;
    pending = null;
    clearTimeout(current.timer);
    current.resolve(decision === "approve");
    send(response, 200, "<h1>Decyzja zapisana / Decision recorded</h1><p>Możesz zamknąć tę kartę. / You may close this tab.</p>");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;

  function requestApproval(exactRequest, digest) {
    const run = () => new Promise(resolve => {
      const current = { exactRequest, digest, nonce: randomBytes(18).toString("hex"),
        csrf: randomBytes(24).toString("hex"), resolve, timer: null };
      current.timer = setTimeout(() => {
        if (pending === current) pending = null;
        resolve(false);
      }, 300000);
      pending = current;
    });
    const result = queue.then(run);
    queue = result.then(() => undefined);
    return result;
  }

  async function close() {
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(false);
      pending = null;
    }
    await new Promise(resolve => server.close(resolve));
  }

  return { origin, requestApproval, close };
}
