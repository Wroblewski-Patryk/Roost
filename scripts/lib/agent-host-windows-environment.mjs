import path from "node:path";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";

export const windowsEnvironmentPolicy = "roost-windows-system-environment-v1";
const absent = Symbol("absent_environment_key");
const fail = code => { throw Object.assign(new Error(code), { protocolAdmission: true, retryable: false,
  publicMessage: "Windows startup environment is invalid.", details: { reason: code } }); };
function selected(source, key) {
  const names = Object.keys(source).filter(name => name.toUpperCase() === key);
  if (names.length > 1) fail("hermes_windows_environment_ambiguous");
  return names.length ? source[names[0]] : absent;
}

// Pure parsing, also used by cross-platform synthetic tests. This grants no
// startup authority: admission separately checks the live Worker's physical root.
export function deriveWindowsSystemEnvironment(source, platform = process.platform) {
  if (platform !== "win32") return {};
  const root = selected(source, "SYSTEMROOT"), supplied = selected(source, "SYSTEMDRIVE");
  if (typeof root !== "string" || root.length > 32768 || !/^[a-z]:\\[^\\]/i.test(root)
      || /[\x00-\x1f\x7f<>"|?*%/]/.test(root) || root.slice(2).includes(":")
      || root !== path.win32.normalize(root) || root.endsWith("\\")
      || root.slice(3).split("\\").some(p => !p || /[. ]$/.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))
    fail("hermes_windows_systemroot_invalid");
  const drive = root.slice(0, 2).toUpperCase();
  if (supplied !== absent && (typeof supplied !== "string" || !/^[a-z]:$/i.test(supplied) || supplied.toUpperCase() !== drive))
    fail("hermes_windows_systemdrive_invalid");
  return { SYSTEMROOT: drive + root.slice(2), SYSTEMDRIVE: drive };
}

// No expansion: unresolved tokens in configured paths fail, never rewrite task
// text, source code or a path into a different authority scope.
export function assertWindowsStartupPaths(values, platform = process.platform) {
  if (platform === "win32" && values.some(value => typeof value === "string" && /%[^%\x00-\x1f]+%/.test(value)))
    fail("hermes_windows_path_token_unresolved");
}

export function inspectWindowsSystemEnvironment(source = process.env) {
  const environment = deriveWindowsSystemEnvironment(source);
  if (process.platform !== "win32") return { environment, rootIdentity: null };
  try {
    // Existing native identity check rejects symlink/junction ancestors and
    // realpath aliases. It reads directory metadata only, never system contents.
    return { environment, rootIdentity: physicalIdentity(environment.SYSTEMROOT) };
  } catch { fail("hermes_windows_systemroot_unproven"); }
}
