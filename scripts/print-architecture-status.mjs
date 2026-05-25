import fs from "fs";
import path from "path";

const root = process.cwd();
const bundlePath = path.join(root, "docs/status/architecture-proof-bundle.json");

if (!fs.existsSync(bundlePath)) {
  console.error("Architecture status unavailable: missing docs/status/architecture-proof-bundle.json");
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const graph = bundle.graph ?? {};
const delta = bundle.delta ?? {};
const gates = Array.isArray(bundle.gates) ? bundle.gates : [];
const failingGates = gates.filter((gate) => gate.status !== "passed");

const green =
  bundle.allGatesPass === true &&
  Number(bundle.evidenceQueue ?? 0) === 0 &&
  Number(bundle.chainWorklist ?? 0) === 0 &&
  Number(delta.nodes ?? 0) === 0 &&
  Number(delta.relations ?? 0) === 0 &&
  Number(delta.chains ?? 0) === 0;

console.log(`Architecture Status: ${green ? "GREEN" : "RED"}`);
console.log(
  `Graph: ${Number(graph.nodes ?? 0)} nodes / ${Number(graph.relations ?? 0)} relations / ${Number(graph.chains ?? 0)} chains`
);
console.log(`Evidence queue: ${Number(bundle.evidenceQueue ?? 0)}`);
console.log(`Chain worklist: ${Number(bundle.chainWorklist ?? 0)}`);
console.log(
  `Delta: nodes=${Number(delta.nodes ?? 0)}, relations=${Number(delta.relations ?? 0)}, chains=${Number(delta.chains ?? 0)}`
);
console.log(`All gates pass: ${bundle.allGatesPass === true ? "yes" : "no"}`);

if (failingGates.length) {
  console.log("Failing/unknown gates:");
  for (const gate of failingGates) {
    console.log(`- ${gate.file}: ${gate.status}`);
  }
}
