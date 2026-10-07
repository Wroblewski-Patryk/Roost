import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
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
function startupWait(statuses, cost = 3000, probeOverrun = 0) {
  // Monotonic clock/probe/pause doubles run the actual wait; no daemon reads.
  const cmd = `. '${script.replaceAll("'", "''")}' -Library; $v=([Console]::In.ReadToEnd()|ConvertFrom-Json); $script:clock=[pscustomobject]@{ElapsedMilliseconds=0}; $script:index=0; $script:timeouts=@(); $script:pauses=@(); $probe={param($milliseconds) $script:timeouts+=,$milliseconds; $script:clock.ElapsedMilliseconds += [Math]::Min($v.cost,$milliseconds)+$v.probeOverrun; $status=$v.statuses[[Math]::Min($script:index,$v.statuses.Count-1)]; $script:index++; return $status}; $pause={param($milliseconds) $script:pauses+=,$milliseconds; $script:clock.ElapsedMilliseconds += $milliseconds}; try { $healthy=Wait-DockerDaemonHealthy -Clock $script:clock -Probe $probe -Pause $pause; @{healthy=$healthy;elapsed=$script:clock.ElapsedMilliseconds;timeouts=@($script:timeouts);pauses=@($script:pauses)}|ConvertTo-Json -Compress } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }`;
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { input: JSON.stringify({ statuses, cost, probeOverrun }), encoding: 'utf8', timeout: 10000 });
}
test('startup waits through transient unproven/unavailable and accepts only actual healthy within deadline', () => {
  const r = startupWait(['unproven', 'unavailable', 'unproven', 'healthy']);
  assert.equal(r.status, 0, r.stderr);
  const v = JSON.parse(r.stdout); assert.equal(v.healthy, true); assert.equal(v.elapsed, 12750);
  assert.deepEqual(v.timeouts, [3000, 3000, 3000, 3000]); assert.deepEqual(v.pauses, [250, 250, 250]);
});
test('never healthy startup expires at unchanged 60 seconds with bounded final probe and no late-health promotion', () => {
  for (const status of ['unproven', 'unavailable']) {
    const r = startupWait([status]); assert.equal(r.status, 0, r.stderr);
    const v = JSON.parse(r.stdout); assert.equal(v.healthy, false); assert.equal(v.elapsed, 60000);
    assert.ok(v.timeouts.every(t => Number.isInteger(t) && t > 0 && t <= 3000));
    assert.ok(v.pauses.every(t => Number.isInteger(t) && t > 0 && t <= 250));
    assert.equal(v.timeouts.at(-1), 1500);
  }
  const r = startupWait(['unknown']); assert.equal(r.status, 1); assert.match(r.stderr, /daemon_probe_status/);
  const late = startupWait(['healthy'], 3000, 60000); assert.equal(late.status, 0, late.stderr);
  assert.equal(JSON.parse(late.stdout).healthy, false); assert.equal(JSON.parse(late.stdout).elapsed, 63000);
  const wait = source.slice(source.indexOf('function Wait-DockerDaemonHealthy('), source.indexOf('function Read-GuardParent('));
  assert.doesNotMatch(wait, /Start-Process|\.Kill\(|Stop-GuardOwnedProbe|Get-Process/);
  assert.match(wait, /if \(\$remaining -le 0\) \{ break \}/);
  assert.match(wait, /return \(\$Clock.ElapsedMilliseconds -le 60000\)/);
});
function startupInvocation(statuses) {
  // Actual intent/receipt lifecycle runs only in a new test-owned temp root.
  // Desktop start, process inventory, daemon probes, clock and pause are doubles.
  const root = mkdtempSync(path.join(os.tmpdir(), 'roost-guard-startup-test-'));
  try {
    const desktop = path.join(root, 'Programs', 'Docker', 'Docker', 'Docker Desktop.exe');
    mkdirSync(path.dirname(desktop), { recursive: true }); writeFileSync(desktop, 'inert fixture');
    const cmd = `. '${script.replaceAll("'", "''")}' -Library -Start; $v=([Console]::In.ReadToEnd()|ConvertFrom-Json); $env:LOCALAPPDATA=Join-Path $v.root 'Local'; $env:ProgramData=Join-Path $v.root 'ProgramData'; $env:ProgramFiles=Join-Path $v.root 'Programs'; $script:clock=[pscustomobject]@{ElapsedMilliseconds=0}; $script:starts=0; $script:kills=0; $script:probes=0; $script:actualWait=(Get-Command Wait-DockerDaemonHealthy).ScriptBlock; function Read-DockerGuardState { $p=Get-GuardPaths $env:LOCALAPPDATA $env:ProgramData; return @{schemaVersion='roost-docker-runtime-observation-v1';localAppData=$env:LOCALAPPDATA;programData=$env:ProgramData;daemon='unavailable';dockerProcesses=0;processReadComplete=$true;writerAbsent=$true;recoveryAbsent=$true;outstandingReceipt=$false;parents=@($p.Parents|ForEach-Object{@{path=$_;exists=$false;readComplete=$true;reparsePoint=$false;leaves=@()}})} }; function Start-Process { param($FilePath,$WindowStyle) if($FilePath -cne (Join-Path $env:ProgramFiles 'Docker\\Docker\\Docker Desktop.exe') -or $WindowStyle -ne 'Hidden'){throw 'wrong_start'}; $script:starts++; if($script:starts -gt 1){throw 'restart_refused'} }; function Stop-GuardOwnedProbe { param($Process) $script:kills++; throw 'unexpected_probe_kill' }; function Get-DockerDaemonState { param($TimeoutMilliseconds=3000) $status=$v.statuses[[Math]::Min($script:probes,$v.statuses.Count-1)]; $script:probes++; $script:clock.ElapsedMilliseconds += [Math]::Min(3000,$TimeoutMilliseconds); return $status }; function Wait-DockerDaemonHealthy { & $script:actualWait -Clock $script:clock -Probe {param($milliseconds) Get-DockerDaemonState $milliseconds} -Pause {param($milliseconds) $script:clock.ElapsedMilliseconds += $milliseconds} }; $errorCode=$null; $result=$null; try{$result=Invoke-DockerRuntimeGuard}catch{$errorCode=$_.Exception.Message}; $p=Get-GuardPaths $env:LOCALAPPDATA $env:ProgramData; @{errorCode=$errorCode;result=$result;starts=$script:starts;kills=$script:kills;elapsed=$script:clock.ElapsedMilliseconds;active=(Test-Path -LiteralPath (Join-Path $p.Receipts 'active.json'));receiptNames=@(Get-ChildItem -LiteralPath $p.Receipts|ForEach-Object{$_.Name})}|ConvertTo-Json -Depth 10 -Compress`;
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { input: JSON.stringify({ root, statuses }), encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 0, r.stderr); const v = JSON.parse(r.stdout);
    const receipts = readdirSync(path.join(root, 'Local', 'Roost', 'docker-runtime-guard'));
    assert.deepEqual(v.receiptNames.sort(), receipts.sort()); return v;
  } finally {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir())); assert.match(path.basename(target), /^roost-guard-startup-test-/);
    rmSync(target, { recursive: true, force: true });
  }
}
test('one normal start survives a transient unproven probe then completes strict health receipt', () => {
  const v = startupInvocation(['unproven', 'healthy']);
  assert.equal(v.errorCode, null); assert.equal(v.starts, 1); assert.equal(v.kills, 0);
  assert.equal(v.result.daemon, 'healthy'); assert.equal(v.result.reconciliationPending, false); assert.equal(v.active, false);
  assert.equal(v.receiptNames.filter(n => n.endsWith('-complete.json') && !n.endsWith('-intent-complete.json')).length, 1);
  assert.equal(v.receiptNames.filter(n => n.endsWith('-start-intent.json')).length, 1);
});
test('never healthy after one start retains active intent and no completion receipt for normal reconciliation', () => {
  const v = startupInvocation(['unproven']);
  assert.equal(v.errorCode, 'docker_runtime_guard_partial_or_uncertain_reconcile_required');
  assert.equal(v.result, null); assert.equal(v.elapsed, 60000); assert.equal(v.starts, 1); assert.equal(v.kills, 0); assert.equal(v.active, true);
  assert.ok(v.receiptNames.includes('active.json')); assert.equal(v.receiptNames.filter(n => n.endsWith('-complete.json')).length, 0);
  assert.equal(v.receiptNames.filter(n => n.endsWith('-start-intent.json')).length, 1);
});
