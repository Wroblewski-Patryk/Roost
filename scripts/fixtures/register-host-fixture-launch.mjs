// Only legacy transport/context tests import this loader in their child Node.
// Production keeps the real pre-spawn boundary and exposes no test switch.
import { register } from "node:module";
import { isMainThread } from "node:worker_threads";
if (isMainThread) register(import.meta.url);
export function resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith("/scripts/roost-codex-agent-host.mjs")
      && specifier === "./lib/agent-host-provider-launch.mjs")
    return nextResolve(new URL("./host-fixture-launch.mjs", import.meta.url).href, context);
  return nextResolve(specifier, context);
}
