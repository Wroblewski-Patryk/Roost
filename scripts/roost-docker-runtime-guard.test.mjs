import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const script = path.resolve('scripts/roost-docker-runtime-guard.ps1');
const source = readFileSync(script, 'utf8');
function fixture() {
  return { schemaVersion: 'roost-docker-runtime-observation-v1', localAppData: 'C:\\Fixture\\Local', programData: 'C:\\Fixture\\ProgramData', daemon: 'unavailable', dockerProcesses: 0, processReadComplete: true, writerAbsent: true, recoveryAbsent: true, outstandingReceipt: false,
    parents: [{ path: 'C:\\Fixture\\Local\\Docker\\run', exists: true, reparsePoint: false, readComplete: true, leaves: ['dockerInference', 'sailor-ingest.sock', 'dockerEthernetVfkit', 'userAnalyticsOtlpHttp.sock'].map(name => ({ name, length: 0, directory: false, reparsePoint: true, linkType: '' })) }, { path: 'C:\\Fixture\\Local\\docker-secrets-engine', exists: true, reparsePoint: false, readComplete: true, leaves: [{ name: 'engine.sock', length: 0, directory: false, reparsePoint: true, linkType: '' }] }] };
}
function plan(state, recover = true, start = false) {
  const cmd = `. '${script.replaceAll("'", "''")}' -Library; $v=([Console]::In.ReadToEnd()|ConvertFrom-Json); try { Get-DockerGuardPlan $v $${recover} $${start}|ConvertTo-Json -Compress } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }`;
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { input: JSON.stringify(state), encoding: 'utf8', timeout: 10000 });
}
test('inspect is inert and healthy Docker is never stopped or quarantined', () => {
  for (const [state, recover, action] of [[fixture(), false, 'inspect'], [{ ...fixture(), daemon: 'healthy', dockerProcesses: 3 }, true, 'healthy_skip']]) {
    const r = plan(state, recover); assert.equal(r.status, 0, r.stderr); const p = JSON.parse(r.stdout); assert.equal(p.action, action); assert.equal(p.mutate, false); assert.equal(p.start, false);
  }
});
test('only the exact stopped, writer-free, zero-byte socket parents qualify', () => {
  const r = plan(fixture(), true, true); assert.equal(r.status, 0, r.stderr); assert.deepEqual(JSON.parse(r.stdout), { action: 'quarantine_parents', mutate: true, start: true });
});
for (const [name, edit] of Object.entries({ daemonUnknown: x => x.daemon = 'unproven', processRunning: x => x.dockerProcesses = 1, incompleteProcessRead: x => x.processReadComplete = false, writer: x => x.writerAbsent = false, recovery: x => x.recoveryAbsent = false, uncertainIntent: x => x.outstandingReceipt = true, wrongPath: x => x.parents[0].path += '\\other', parentReparse: x => x.parents[0].reparsePoint = true, incompleteDirectory: x => x.parents[0].readComplete = false, unknownLeaf: x => x.parents[0].leaves[0].name = 'business-data', normalFile: x => x.parents[0].leaves[0].reparsePoint = false, nonemptySocket: x => x.parents[0].leaves[0].length = 1, fileSymlink: x => x.parents[0].leaves[0].linkType = 'SymbolicLink', junction: x => x.parents[1].leaves[0].linkType = 'Junction', unknownLinkMetadata: x => delete x.parents[0].leaves[0].linkType, nestedDirectory: x => x.parents[0].leaves[0].directory = true, extraParent: x => x.parents.push(x.parents[0]), duplicateLeaf: x => x.parents[0].leaves.push(x.parents[0].leaves[0]) })) {
  test(`recovery refuses ${name}`, () => { const x = fixture(); edit(x); const r = plan(x); assert.equal(r.status, 1); assert.match(r.stderr, /docker_runtime_guard_/); });
}
test('normal start cannot silently skip stale parents', () => {
  assert.equal(plan(fixture(), false, true).status, 1);
  const clean = fixture(); clean.parents.forEach(x => { x.exists = false; x.leaves = []; });
  assert.equal(plan(clean, true, true).status, 1);
  const r = plan(clean, false, true); assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).action, 'start_clean_missing_parents');
});
test('effect surface is parent-only preservation with durable uncertainty and bounded normal startup', () => {
  assert.doesNotMatch(source, /\b(?:Remove-Item|Stop-Process|Restart-Service|Stop-Service|taskkill|docker\s+(?:prune|reset)|wsl(?:\.exe)?\s+--shutdown)\b/i);
  assert.match(source, /Rename-Item -LiteralPath \$source -NewName \$name/);
  assert.match(source, /FileMode\]::CreateNew/); assert.match(source, /\.Flush\(\$true\)/);
  assert.match(source, /Start-Process -FilePath \$desktop -WindowStyle Hidden/);
  assert.match(source, /ElapsedMilliseconds -lt 60000/);
  assert.match(source, /partial_or_uncertain_reconcile_required/);
  assert.match(source, /if \(-not \$Library\)/);
  assert.match(source, /if \(\$plan.start\) \{ Assert-Guard \(\$finalDaemon -eq 'healthy'\)/);
  assert.match(source, /daemon = \$finalDaemon; reconciliationPending = \$false/);
  assert.match(source, /final_marker_outcome_uncertain/);
});
test('probe timeout cleanup stops only its created probe and refuses unknown exit', () => {
  // In-memory Process doubles: no Docker processes or filesystem effects.
  const cmd = `. '${script.replaceAll("'", "''")}' -Library; $results=@(); foreach($case in @('alreadyClosed','exitAfterKill','neverConfirms','killThrows','unregistered')) { $p=[pscustomobject]@{HasExited=($case -eq 'alreadyClosed');Kills=0;Waits=0;Case=$case}; $p|Add-Member ScriptMethod Kill { $this.Kills++; if($this.Case -eq 'killThrows'){throw 'synthetic'}; if($this.Case -eq 'exitAfterKill'){$this.HasExited=$true} }; $p|Add-Member ScriptMethod WaitForExit { param($milliseconds) if($milliseconds -ne 1000){throw 'unbounded'}; $this.Waits++; return $this.HasExited }; if($case -ne 'unregistered'){$script:GuardOwnedProbeProcesses.Add($p)|Out-Null}; $ok=Stop-GuardOwnedProbe $p; $results+=@{case=$case;confirmed=$ok;kills=$p.Kills;waits=$p.Waits} }; $results|ConvertTo-Json -Compress`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', timeout: 10000 });
  assert.equal(r.status, 0, r.stderr);
  const rows = JSON.parse(r.stdout);
  assert.deepEqual(rows.map(x => [x.case, x.confirmed, x.kills, x.waits]), [['alreadyClosed', true, 0, 0], ['exitAfterKill', true, 1, 1], ['neverConfirms', false, 1, 1], ['killThrows', false, 1, 0], ['unregistered', false, 0, 0]]);
  assert.match(source, /finally \{\s*if \(\$started\) \{ Stop-GuardOwnedProbe \$process/);
  assert.doesNotMatch(source, /\.Kill\([^)]*\$true/);
});
