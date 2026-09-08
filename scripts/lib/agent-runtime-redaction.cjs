"use strict";
const { isUtf8 } = require("node:buffer");
// One policy for API and host. Never return a match, input-derived fingerprint,
// arbitrary field name or exception text in findings.
const POLICY = "roost-runtime-redaction-v1";
const MARKER = "[REDACTED]";
const LIMITS = Object.freeze({ bytes: 524288, string: 131072, nodes: 20000, depth: 32, findings: 32, secrets: 128 });
const secretField = /^(?:password|passwd|pwd|secret|clientsecret|clientkey|secretkey|encryptionkey|signingkey|apikey|token|authtoken|sessiontoken|bearertoken|accesstoken|refreshtoken|idtoken|authorization|proxyauthorization|cookie|setcookie|privatekey|credentials|leasetoken|.*password|.*secret|.*apikey)$/i;
const personalField = /^(?:email|emailaddress|personalemail|phone|phonenumber|mobile|postaladdress|streetaddress|homeaddress|dateofbirth|birthdate|ssn|passportnumber|nationalid|personalname|firstname|lastname|fullname)$/i;
const keyName = key => key.toLowerCase().replace(/[-_\s.]/g, "");
const safeFields = new Set("prompt contract task application execution metadata payload message summary finalResponse verification usage errorState details checkpoint evidence attachments content text body headers context sources events name title description code type status reference url changedFiles reason objective outcome scope allowed forbidden acceptance tests email phone password authorization cookie privateKey data identity workspaceId taskId executionId applicationId recordId correlationId policy surface findings category location fingerprint blocked redacted incidentIds stage packetRevision contextRevision workspaceDigest sessionId version attempt".split(" "));
const credentialPattern = /(?:\bcc_v1_[A-Za-z0-9_-]{24,}|\b(?:sk-(?:proj-)?|gh[pousr]_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{16,}|\bAKIA[A-Z0-9]{16}\b|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.~-]{8,}|-----BEGIN[^\r\n]{0,80}PRIVATE KEY-----|(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|set-cookie)["'\s]{0,8}[:=]\s*["']?[^\s"',;}]{3,}|[a-z][a-z0-9+.-]{1,20}:\/\/[^\s/:]+:[^\s/@]+@)/i;
const emailPattern = /\b[A-Z0-9._%+-]{1,80}@[A-Z0-9.-]{1,160}\.[A-Z]{2,24}\b/i;
const piiAssignment = /(?:email|phone(?:number)?|ssn|passportnumber|nationalid|dateofbirth|homeaddress)["'\s]{0,8}[:=]\s*["']?[^\s"',;}]{3,}/i;
function normalize(value) {
  let text = value.normalize("NFKC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "");
  for (let i = 0; i < 3; i++) {
    const before = text;
    text = text.replace(/\\u([a-f0-9]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\x([a-f0-9]{2})/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
    try { text = decodeURIComponent(text); } catch { /* check the original too */ }
    if (before === text) break;
  }
  return text;
}
function knownRuntimeSecrets(environment = process.env, extra = []) {
  const values = [...extra];
  for (const [key, value] of Object.entries(environment)) {
    // Shell working-directory variables are not password fields. In JSON, pwd
    // remains a protected credential field; environment semantics differ.
    if (key === "PWD" || key === "OLDPWD") continue;
    if (typeof value !== "string" || !value) continue;
    if (secretField.test(keyName(key)) || /(?:TOKEN|PASSWORD|SECRET|SECRET_KEY|PRIVATE_KEY|ENCRYPTION_KEY|API_KEY|COOKIE|AUTHORIZATION)$/i.test(key)) values.push(value);
    if (/DATABASE_URL|REDIS_URL/i.test(key)) { try { values.push(decodeURIComponent(new URL(value).password)); } catch { /* no diagnostics */ } }
  }
  return [...new Set(values.filter(v => typeof v === "string" && v.length > 0))];
}
function sanitize(input, { secrets = [], mode = "diagnostic" } = {}) {
  const findings = [], seen = new WeakSet(), fragments = new Set(), exact = [];
  let nodes = 0, bytes = 0, collected = [], fatal = false;
  const groupedStrings = new Map();
  function finding(category, location) {
    if (findings.length < LIMITS.findings && !findings.some(f => f.category === category && f.location === location)) findings.push({ category, location });
  }
  try {
    if (!Array.isArray(secrets) || secrets.length > LIMITS.secrets) throw new Error();
    if (secrets.reduce((n, value) => n + (typeof value === "string" ? value.length : 0), 0) > 32768) throw new Error();
    for (const secret of secrets) {
      if (typeof secret !== "string" || secret.length < 8 || secret.length > 8192) throw new Error();
      const value = normalize(secret); exact.push(value);
      // Detect ordinary splits of known runtime values without persisting a raw
      // stream. Shorter unknown fragments are outside this deterministic policy.
      if (value.length >= 32 && !/^[a-f0-9-]{36}$/i.test(value)) for (let i = 0; i <= value.length - 16; i++) {
        const fragment = value.slice(i, i + 16);
        if (new Set(fragment).size >= 12) fragments.add(fragment);
      }
    }
    function containsFragment(text) { for (let i = 0; i <= text.length - 16; i++) if (fragments.has(text.slice(i, i + 16))) return true; return false; }
    function category(value, decode = 3) {
      const text = normalize(value);
      if (exact.some(secret => text.includes(secret)) || containsFragment(text)) return "known_secret";
      if (credentialPattern.test(text)) return "credential";
      if (emailPattern.test(text) || piiAssignment.test(text)) return "personal_data";
      if (decode) {
        const tokens = text.match(/[A-Za-z0-9+/_=-]{16,}/g) ?? [];
        if (tokens.length > 2048) return "limit";
        for (const token of tokens) {
          if (token.length > LIMITS.string) return "limit";
          const bytes = /^[a-f0-9]{32,}$/i.test(token) && token.length % 2 === 0 ? Buffer.from(token, "hex") : Buffer.from(token, "base64url");
          const decoded = bytes.toString("utf8");
          if (decoded !== text) {
            // Digest bytes are not encoded prose. Replacement decoding followed
            // by control removal can invent an email that never existed. Only
            // valid UTF-8 participates in recursive text/PII interpretation;
            // known secrets and credential syntax remain protected in any bytes.
            if (isUtf8(bytes)) { if (category(decoded, decode - 1)) return "encoded_sensitive"; }
            else { const normalized = normalize(decoded); if (exact.some(secret => normalized.includes(secret)) || containsFragment(normalized) || credentialPattern.test(normalized)) return "encoded_sensitive"; }
          }
        }
      }
      return null;
    }
    function walk(value, location, depth, field = "", parent = "") {
      if (++nodes > LIMITS.nodes || depth > LIMITS.depth) { fatal = true; finding("limit", location); return MARKER; }
      if (value === null || value === undefined || typeof value === "boolean") return value;
      if (value === MARKER) { if (mode === "required") finding("previously_redacted", location); return value; }
      const normalizedField = keyName(normalize(field));
      const personalName = normalizedField === "name" && /^(?:user|reviewerUser|contact|person|customer|owner)$/i.test(normalize(parent));
      if ((secretField.test(normalizedField) || personalField.test(normalizedField) || personalName) && value !== "") { finding(personalField.test(normalizedField) || personalName ? "personal_data" : "credential_field", location); return MARKER; }
      if (typeof value === "number") { if (!Number.isFinite(value)) { fatal = true; finding("unsupported", location); return MARKER; } return value; }
      if (typeof value === "string") {
        bytes += Buffer.byteLength(value);
        if (bytes > LIMITS.bytes || value.length > LIMITS.string) { fatal = true; finding("limit", location); return MARKER; }
        if (value === MARKER) return value;
        const type = category(value);
        if (type) { finding(type, location); if (type === "limit") fatal = true; return MARKER; }
        collected.push(value);
        const group = /^\d+$/.test(field) ? parent : field;
        if (["text", "message", "content", "body", "output", "chunk", "parts", "fragments", "delta"].includes(group)) {
          if (!groupedStrings.has(group)) groupedStrings.set(group, []);
          groupedStrings.get(group).push(value);
        }
        return value;
      }
      if (typeof value !== "object" || value instanceof Date && !Number.isFinite(+value)) { fatal = true; finding("unsupported", location); return MARKER; }
      if (value instanceof Date) return value;
      if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer || !Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) { fatal = true; finding("unsupported", location); return MARKER; }
      if (seen.has(value)) { fatal = true; finding("cycle", location); return MARKER; }
      seen.add(value);
      const result = Array.isArray(value) ? [] : {};
      const descriptors = Object.getOwnPropertyDescriptors(value);
      if (descriptors.type?.value === "Buffer" && Array.isArray(descriptors.data?.value)) { fatal = true; finding("unsupported_format", location); seen.delete(value); return MARKER; }
      if (mode === "required" && descriptors.redacted?.value === true && descriptors.policy?.value === POLICY) { finding("previously_redacted", location); fatal = true; }
      const mime = descriptors.mimeType?.value ?? descriptors.contentType?.value;
      if (!mime && /^(?:attachments?|files?)$/i.test(parent || field) && ["content", "data", "base64", "bytes"].some(key => descriptors[key])) { fatal = true; finding("unsupported_format", location); seen.delete(value); return MARKER; }
      if (mime && typeof mime === "string" && !/^(?:text\/(?:plain|markdown|csv)|application\/json)(?:;|$)/i.test(mime)) { fatal = true; finding("unsupported_format", location); seen.delete(value); return MARKER; }
      let index = 0;
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (Array.isArray(value) && key === "length") continue;
        if (++index > LIMITS.nodes || bytes > LIMITS.bytes) { fatal = true; finding("limit", location); break; }
        bytes += Buffer.byteLength(key);
        if (bytes > LIMITS.bytes || key.length > LIMITS.string) { fatal = true; finding("limit", location); break; }
        const safe = safeFields.has(key) ? key : Array.isArray(value) ? String(index - 1) : `field[${index - 1}]`;
        const next = `${location}.${safe}`;
        if (!Object.hasOwn(descriptor, "value")) { fatal = true; finding("unsupported", next); continue; }
        const keyType = category(key);
        const target = keyType || ["__proto__", "constructor", "prototype"].includes(key) ? `redacted_field_${index}` : key;
        if (keyType) finding(keyType, next);
        Object.defineProperty(result, target, { value: walk(descriptor.value, next, depth + 1, key, field), enumerable: true, writable: true, configurable: true });
      }
      seen.delete(value); return result;
    }
    let value = walk(input, "$", 0);
    // Examine joins without field names. This catches split/encoded values in
    // nested JSON while keeping all raw fragments strictly in bounded memory.
    if (collected.length > 1 && !fatal) {
      const joined = collected.join("");
      if (category(joined)) { finding("split_sensitive", "$"); fatal = true; }
      if (!fatal) for (const group of groupedStrings.values()) if (group.length > 1 && category(group.join(""))) { finding("split_sensitive", "$"); fatal = true; break; }
    }
    if (fatal) value = Array.isArray(input) ? [MARKER] : input && typeof input === "object" ? { redacted: true, policy: POLICY } : MARKER;
    return { value, findings, redacted: findings.length > 0, blocked: fatal || mode === "required" && findings.length > 0, policy: POLICY };
  } catch {
    return { value: MARKER, findings: [{ category: "sanitizer_failure", location: "$" }], redacted: true, blocked: true, policy: POLICY };
  }
}
module.exports = { POLICY, MARKER, LIMITS, sanitize, knownRuntimeSecrets };
