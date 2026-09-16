import { createHash } from "node:crypto";

export const recoveryIdentityVersion = "roost-recovery-identity-v2";
export const legacyInputIdentityVersion = "roost-provider-input-identity-v1";
export const legacyReviewIdentityVersion = "roost-native-review-identity-v1";
export const recoveryIdentityFields = Object.freeze(["executionId", "workspaceId", "taskId", "applicationId", "attempt"]);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sha = text => createHash("sha256").update(text).digest("hex");
const fail = () => { throw Error("native_recovery_identity_invalid"); };
function checked(value) {
  if (!value || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || Reflect.ownKeys(value).length !== 5 || Reflect.ownKeys(value).some(k => !recoveryIdentityFields.includes(k))) fail();
  for (const key of recoveryIdentityFields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) fail();
    if (key === "attempt" ? !Number.isSafeInteger(descriptor.value) || descriptor.value < 1
      : typeof descriptor.value !== "string" || !uuid.test(descriptor.value)) fail();
  }
  return value;
}
export function parseRecoveryIdentity(text) {
  let value, keys;
  try {
    if (typeof text !== "string" || text.length > 2048) fail();
    value = checked(JSON.parse(text));
    // Only a flat five-field object with UUID strings and a number is valid.
    // Decode property escapes before checking duplicates (JSON.parse loses them).
    keys = [...text.matchAll(/("(?:\\.|[^"\\])*")\s*:/g)].map(m => JSON.parse(m[1]));
  } catch { fail(); }
  if (keys.length !== 5 || new Set(keys).size !== 5 || keys.some(k => !recoveryIdentityFields.includes(k))) fail();
  return value;
}
export function serializeRecoveryIdentity(value) {
  checked(value);
  return JSON.stringify([recoveryIdentityVersion, recoveryIdentityFields.map(k => [k, k === "attempt" ? value[k] : value[k].toLowerCase()])]);
}
export const recoveryIdentityDigest = value => sha(serializeRecoveryIdentity(value));
export function legacyRecoveryIdentityDigest(value, version) {
  checked(value);
  const fields = version === legacyInputIdentityVersion ? [...recoveryIdentityFields].sort()
    : version === legacyReviewIdentityVersion ? recoveryIdentityFields : null;
  if (!fields) fail();
  // Preserve historical case/bytes; do not pretend v2 normalization existed then.
  return sha(JSON.stringify(Object.fromEntries(fields.map(k => [k, value[k]]))));
}
export function bridgeRecoveryIdentity(value, originalDigest, requiredVersion) {
  checked(value);
  const versions = requiredVersion ? [requiredVersion] : [legacyInputIdentityVersion, legacyReviewIdentityVersion];
  const matches = versions.filter(version => legacyRecoveryIdentityDigest(value, version) === originalDigest);
  if (matches.length !== 1) throw Error("native_recovery_spent_chain_missing");
  const rows = recoveryIdentityFields.map(k => [k, k === "attempt" ? value[k] : value[k].toLowerCase()]);
  return Object.freeze({ legacySerializerVersion: matches[0], legacyIdentityDigest: originalDigest,
    canonicalSerializerVersion: recoveryIdentityVersion, canonicalIdentityDigest: recoveryIdentityDigest(value),
    equalFields: 5, fieldEqualityDigest: sha(JSON.stringify(rows.map(([key, normalized]) => [key, normalized, normalized]))) });
}
