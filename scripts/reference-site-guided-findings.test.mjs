import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { verifyGuidedPackages, buildGuidedFindingInput, parseGuidedFindingOutput } from './lib/reference-site-guided-findings.mjs';
import { draftGuidedFindings } from './lib/reference-site-guided-session.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const taskId = '11111111-1111-4111-8111-111111111111';
const siteIds = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const reviewIds = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'];
const revision = '2026-10-13T10:00:00.000Z';
const observations = ['first-approved-observation', 'second-approved-observation'];
const fixtures = () => {
  const responses = siteIds.map((siteId, index) => {
    const url = `https://example${index + 1}.test/`;
    const pkg = { schemaVersion: 'roost-reference-site-package-v1',
      source: { publishedUrl: url }, preparedAt: revision,
      observations: [{ id: observations[index], category: 'content', language: index === 0 ? 'ja' : 'en',
        text: `Saved source text for site ${index + 1}; never a fresh visit.`,
        evidence: [{ kind: 'source', scope: 'source_only', ref: 'fictional/path' }] }], unknowns: [] };
    return { taskId, siteId, status: 'unverified', title: `Fictional site ${index + 1}`, package: pkg,
      source: { url, recordRevision: revision, sourceReviewId: reviewIds[index], contentDigest: sha(pkg) } };
  });
  const pins = { taskId, sites: responses.map((r, index) => ({ siteId: r.siteId,
    observationId: observations[index], siteRevision: revision,
    sourceReviewId: reviewIds[index], packageDigest: r.source.contentDigest })) };
  return { pins, responses };
};
const result = () => JSON.stringify({ schemaVersion: 'roost-reference-site-guided-output-v1',
  findings: siteIds.map((siteId, index) => ({ siteId, observationId: observations[index],
    title: `Fictional title ${index + 1}`, interpretation: 'Possible design lesson, not a live result.',
    applicability: 'Only after an independent review.' })) });

test('both pinned packages form one sealed no-tool input and two source-derived requests', () => {
  const { pins, responses } = fixtures();
  const verified = verifyGuidedPackages(pins, responses);
  const input = buildGuidedFindingInput(verified);
  const body = JSON.parse(input.input);
  assert.equal(body.sites.length, 2);
  assert.equal(body.sites[0].package.observations[0].text, responses[0].package.observations[0].text);
  assert.equal(input.inputSeal.length, 64);
  const parsed = parseGuidedFindingOutput(result(), verified);
  assert.equal(parsed.proposals.length, 2);
  assert.equal(parsed.proposals[1].body.observed, responses[1].package.observations[0].text);
  assert.equal(parsed.proposals[0].body.sourceExcerpt, responses[0].package.observations[0].text);
  assert.equal(parsed.proposals[0].body.language, 'en');
  assert.equal(parsed.proposals[0].body.uncertainty, 'Saved source evidence; live behavior was not independently verified.');
});

test('foreign task, site, changed review/revision/digest and omitted package stop before model', () => {
  for (const mutate of [
    f => { f.responses[0].taskId = siteIds[0]; },
    f => { f.responses[0].siteId = siteIds[1]; },
    f => { f.responses[0].source.sourceReviewId = reviewIds[1]; },
    f => { f.responses[0].source.recordRevision = '2026-10-13T11:00:00.000Z'; },
    f => { f.responses[0].package.observations[0].text = 'Changed source text'; },
    f => { f.responses.pop(); }
  ]) {
    const f = fixtures(); mutate(f);
    assert.throws(() => verifyGuidedPackages(f.pins, f.responses), /guided_finding_/);
  }
});

test('oversize source, missing or duplicated proposals and model-selected facts are refused', () => {
  const f = fixtures();
  f.responses[0].package.observations[0].text = 'x'.repeat(2001);
  f.responses[0].source.contentDigest = sha(f.responses[0].package);
  f.pins.sites[0].packageDigest = f.responses[0].source.contentDigest;
  assert.throws(() => verifyGuidedPackages(f.pins, f.responses), /observation_invalid/);
  const verified = verifyGuidedPackages(...Object.values(fixtures()));
  for (const mutate of [
    value => value.findings.pop(),
    value => { value.findings[1] = value.findings[0]; },
    value => { value.findings[0].observationId = observations[1]; },
    value => { value.findings[0].observed = 'Invented live result'; },
    value => { value.findings[0].title = 'x'.repeat(241); }
  ]) {
    const value = JSON.parse(result()); mutate(value);
    assert.throws(() => parseGuidedFindingOutput(JSON.stringify(value), verified), /guided_finding_/);
  }
});

test('two individually valid packages over the sealed input ceiling stop before model', () => {
  const f = fixtures();
  for (let index = 0; index < 2; index++) {
    const first = f.responses[index].package.observations[0];
    f.responses[index].package.observations = [first, ...Array.from({ length: 50 }, (_, n) => ({
      ...first, id: `extra-observation-${index}-${n}`, text: 'x'.repeat(1800)
    }))];
    const hash = sha(f.responses[index].package);
    f.responses[index].source.contentDigest = hash;
    f.pins.sites[index].packageDigest = hash;
  }
  const verified = verifyGuidedPackages(f.pins, f.responses);
  assert.throws(() => buildGuidedFindingInput(verified), /input_oversize/);
});

test('fixture reads both pinned packages before passing sealed input to the model seam', async () => {
  const { pins, responses } = fixtures();
  const reads = [], modelInputs = [];
  const getPackage = async (task, site) => {
    reads.push([task, site]);
    return structuredClone(responses[siteIds.indexOf(site)]);
  };
  const draft = await draftGuidedFindings({ pins, getPackage, runModel: async input => {
    modelInputs.push(JSON.parse(input)); return result();
  } });
  assert.deepEqual(reads, siteIds.map(site => [taskId, site]));
  assert.equal(modelInputs.length, 1);
  assert.equal(modelInputs[0].sites.length, 2);
  assert.equal(draft.proposals.length, 2);
  assert.equal(draft.inputSeal.length, 64);
});
