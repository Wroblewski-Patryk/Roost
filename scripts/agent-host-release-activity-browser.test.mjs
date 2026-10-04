import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateActivityBrowserInput} from './lib/agent-host-release-activity-browser.mjs';
const summary='Controlled persisted test activity';
const fixture=()=>({phase:'empty',sshHost:'release-test',containerAddress:'172.18.0.4',port:48443,
 commit:'a'.repeat(40),frontendMetaName:'example-build-revision',cookieName:'example_session',
 token:'aion_sess_'+'b'.repeat(43),summary,summaryDigest:createHash('sha256').update(summary).digest('hex'),
 eventId:'11111111-1111-4111-8111-111111111111'});
test('browser input qualifies only typed bound fixture data',()=>assert.deepEqual(validateActivityBrowserInput(fixture()),fixture()));
for(const [label,patch]of[
 ['external destination',{containerAddress:'203.0.113.10'}],['invalid private octet',{containerAddress:'172.18.999.1'}],
 ['ssh option injection',{sshHost:'-Fother'}],['arbitrary command',{command:'echo arbitrary'}],
 ['remote URL',{url:'https://example.test/'}],['unknown phase',{phase:'login'}],
 ['changed summary',{summary:'Something else'}],['unbounded token',{token:'b'.repeat(4096)}],
 ['missing exact revision',{commit:'HEAD'}],['invalid port',{port:80}],
 ['meta selector injection',{frontendMetaName:'x"] , input'}]
])test(`refuses ${label} before any child or browser`,()=>assert.throws(()=>validateActivityBrowserInput({...fixture(),...patch})));
