import { verifyGuidedPackages, buildGuidedFindingInput, parseGuidedFindingOutput } from './reference-site-guided-findings.mjs';

const deepFreeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

async function currentBundle(pins, getPackage) {
  const responses = [];
  for (const site of pins.sites) responses.push(await getPackage(pins.taskId, site.siteId));
  return verifyGuidedPackages(pins, responses);
}

// Fixture seam for a future attested preparatory runtime. The injected model
// callback is not production provenance or a one-attempt admission boundary.
export async function draftGuidedFindings({ pins, getPackage, runModel }) {
  const verified = await currentBundle(pins, getPackage);
  const sealed = buildGuidedFindingInput(verified);
  const raw = await runModel(sealed.input, sealed.inputSeal);
  const parsed = parseGuidedFindingOutput(raw, verified);
  const draft = deepFreeze({ pins: structuredClone(pins), bundleDigest: verified.bundleDigest,
    inputSeal: sealed.inputSeal, outputDigest: parsed.outputDigest,
    proposals: structuredClone(parsed.proposals) });
  return draft;
}
