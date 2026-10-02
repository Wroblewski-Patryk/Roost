import test from 'node:test';import assert from 'node:assert/strict';import {releaseWorkerDiagnostic} from './lib/agent-host-release-worker.mjs';
test('release diagnostics retain only fixed admission reasons and discard arbitrary exception content',()=>{
 assert.equal(releaseWorkerDiagnostic(Error('release_readiness_changed')),'release_readiness_changed');
 assert.equal(releaseWorkerDiagnostic(Error('release_api_uncertain')),'release_api_uncertain');
 for(const message of ['Bearer private-value','release_password_value','release_api_uncertain\nprivate-value','https://example.test/private','C:\\private\\credential'])assert.equal(releaseWorkerDiagnostic(Error(message)),'release_preflight_unproven');
});
