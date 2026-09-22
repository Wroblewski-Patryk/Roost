// Test-only transport seam for existing fake child-process protocols. This is
// not containment evidence and is never imported by production or its config.
import { projectProviderLaunch } from "../lib/agent-host-provider-launch.mjs";
import { consumeProviderInput } from "../lib/agent-host-provider-input.mjs";
const commands = new Set(["context-test-codex", "active-context-fixture", "packet-test-codex",
  "duration-test-codex", "recovery-test-codex", "output-budget-fixture"]);
export function prepareProviderLaunch(options, consumption) {
  const plan = projectProviderLaunch(options);
  if (plan.kind !== "direct_codex" || !commands.has(plan.command)) throw Error("synthetic_transport_only");
  consumeProviderInput(options.envelope, consumption);
  return plan;
}
