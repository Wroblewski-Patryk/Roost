# Bounded Windows AF_UNIX parent quarantine. Inspect is the default.
# Vendor report: https://github.com/docker/for-win/issues/15064
# This workaround does not guarantee prevention of the underlying Windows bug.
[CmdletBinding()]
param([switch]$Recover, [switch]$Start, [switch]$Library)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:GuardOwnedProbeProcesses = New-Object 'Collections.Generic.HashSet[object]'

function Assert-Guard($Condition, [string]$Code) {
    if (-not $Condition) { throw "docker_runtime_guard_$Code" }
}
function Get-GuardDigest($Value) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 20 -Compress))
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
}
function Get-GuardPaths([string]$LocalAppData, [string]$ProgramData) {
    Assert-Guard ([IO.Path]::IsPathRooted($LocalAppData) -and [IO.Path]::IsPathRooted($ProgramData)) 'environment_paths'
    $local = [IO.Path]::GetFullPath($LocalAppData).TrimEnd('\')
    $program = [IO.Path]::GetFullPath($ProgramData).TrimEnd('\')
    return @{
        Parents = @((Join-Path $local 'Docker\run'), (Join-Path $local 'docker-secrets-engine'))
        Allowed = @(@('dockerInference', 'sailor-ingest.sock', 'dockerEthernetVfkit', 'userAnalyticsOtlpHttp.sock'), @('engine.sock'))
        Writer = Join-Path $program 'Roost\agent-host-writer.lock'
        Recovery = Join-Path $program 'Roost\agent-host-recovery.lock'
        Receipts = Join-Path $local 'Roost\docker-runtime-guard'
    }
}
function Get-DockerGuardPlan($State, [bool]$WantsRecovery, [bool]$WantsStart) {
    Assert-Guard ($State.schemaVersion -eq 'roost-docker-runtime-observation-v1') 'observation_schema'
    if ($State.daemon -eq 'healthy') { return @{ action = 'healthy_skip'; mutate = $false; start = $false } }
    if (-not $WantsRecovery -and -not $WantsStart) { return @{ action = 'inspect'; mutate = $false; start = $false } }
    Assert-Guard ($State.daemon -eq 'unavailable') 'daemon_unavailable_unproven'
    Assert-Guard ($State.dockerProcesses -eq 0 -and $State.processReadComplete -eq $true) 'docker_not_fully_stopped'
    Assert-Guard ($State.writerAbsent -eq $true -and $State.recoveryAbsent -eq $true) 'roost_writer_or_recovery_present'
    Assert-Guard ($State.outstandingReceipt -eq $false) 'previous_operation_uncertain'
    $paths = Get-GuardPaths $State.localAppData $State.programData
    Assert-Guard (@($State.parents).Count -eq 2) 'exact_two_parents'
    $present = 0
    for ($index = 0; $index -lt 2; $index++) {
        $parent = $State.parents[$index]
        Assert-Guard ($parent.path -ceq $paths.Parents[$index] -and $parent.readComplete -eq $true -and $parent.reparsePoint -eq $false) 'parent_path_or_identity'
        if (-not $parent.exists) { Assert-Guard (@($parent.leaves).Count -eq 0) 'absent_parent_contents'; continue }
        $present++
        Assert-Guard (@($parent.leaves).Count -gt 0 -and @($parent.leaves).Count -le $paths.Allowed[$index].Count) 'nonempty_known_parent_required'
        $seen = @{}
        foreach ($leaf in $parent.leaves) {
            Assert-Guard ($paths.Allowed[$index] -ccontains $leaf.name -and -not $seen.ContainsKey($leaf.name)) 'unknown_or_duplicate_leaf'
            $seen[$leaf.name] = $true
            $hasLinkType = if ($leaf -is [Collections.IDictionary]) { $leaf.Contains('linkType') } else { $null -ne $leaf.PSObject.Properties['linkType'] }
            Assert-Guard $hasLinkType 'link_type_unproven'
            Assert-Guard ($leaf.directory -eq $false -and $leaf.reparsePoint -eq $true -and $leaf.length -eq 0 -and $leaf.linkType -ceq '') 'only_empty_socket_reparse_leaves'
        }
    }
    if ($WantsRecovery) { Assert-Guard ($present -gt 0) 'no_recognized_stale_parent'; return @{ action = 'quarantine_parents'; mutate = $true; start = $WantsStart } }
    Assert-Guard ($present -eq 0) 'recovery_required_before_start'
    return @{ action = 'start_clean_missing_parents'; mutate = $false; start = $true }
}
function Assert-PlainAncestors([string]$Path) {
    $next = [IO.Path]::GetFullPath($Path)
    while ($next) {
        if (Test-Path -LiteralPath $next) {
            $item = Get-Item -LiteralPath $next -Force
            Assert-Guard (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'ancestor_reparse_point'
        }
        $parent = [IO.Path]::GetDirectoryName($next)
        if ($parent -eq $next) { break }; $next = $parent
    }
}
function Stop-GuardOwnedProbe($Process) {
    # Identity membership is registered only after this reader starts its probe.
    # Never stop a daemon, enumerate a PID to kill, or kill a process tree.
    if (-not $script:GuardOwnedProbeProcesses.Contains($Process)) { return $false }
    try {
        if ($Process.HasExited) { return $true }
        $Process.Kill()
        return $Process.WaitForExit(1000)
    } catch { return $false }
}
function Get-DockerDaemonState([int]$TimeoutMilliseconds = 3000) {
    $cli = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe'
    if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) { return 'unproven' }
    Assert-PlainAncestors $cli
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $cli
    $info.Arguments = '--host npipe:////./pipe/dockerDesktopLinuxEngine version --format "{{.Server.Version}}"'
    $info.UseShellExecute = $false; $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process; $process.StartInfo = $info; $started = $false
    try {
        $probeClock = [Diagnostics.Stopwatch]::StartNew()
        Assert-Guard ($process.Start()) 'daemon_probe_start'
        $started = $true
        $script:GuardOwnedProbeProcesses.Add($process) | Out-Null
        $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
        # Timeout terminates only our own read-only CLI probe, never Docker.
        if (-not $process.WaitForExit($TimeoutMilliseconds)) { Stop-GuardOwnedProbe $process | Out-Null; return 'unproven' }
        foreach ($read in @($stdout, $stderr)) {
            $remaining = [Math]::Max(0, $TimeoutMilliseconds - [int]$probeClock.ElapsedMilliseconds)
            if (-not $read.Wait($remaining)) { return 'unproven' }
        }
        if ($stdout.Result.Length -gt 16384 -or $stderr.Result.Length -gt 16384) { return 'unproven' }
        if ($process.ExitCode -eq 0 -and $stdout.Result.Trim() -match '^\d+\.\d+\.\d+') { return 'healthy' }
        if ($process.ExitCode -ne 0 -and $stderr.Result -match '(?i)(?:The system cannot find the file specified|No connection could be made|connection refused|cannot connect to the Docker daemon|is the docker daemon running)') { return 'unavailable' }
        return 'unproven'
    } finally {
        if ($started) { Stop-GuardOwnedProbe $process | Out-Null }
        $script:GuardOwnedProbeProcesses.Remove($process) | Out-Null
        $process.Dispose()
    }
}
function Wait-DockerDaemonHealthy(
    $Clock = [Diagnostics.Stopwatch]::StartNew(),
    [scriptblock]$Probe = { param($Milliseconds) Get-DockerDaemonState $Milliseconds },
    [scriptblock]$Pause = { param($Milliseconds) Start-Sleep -Milliseconds $Milliseconds }
) {
    # Startup can make a read-only probe temporarily unavailable or unproven.
    # This wait never starts Docker again and never treats either as healthy.
    while ($Clock.ElapsedMilliseconds -lt 60000) {
        $remaining = 60000 - [int]$Clock.ElapsedMilliseconds
        if ($remaining -le 0) { break }
        $status = & $Probe ([Math]::Min(3000, $remaining))
        Assert-Guard ($status -in @('healthy', 'unavailable', 'unproven')) 'daemon_probe_status'
        if ($status -eq 'healthy') { return ($Clock.ElapsedMilliseconds -le 60000) }
        $remaining = 60000 - [int]$Clock.ElapsedMilliseconds
        if ($remaining -gt 0) { & $Pause ([Math]::Min(250, $remaining)) }
    }
    return $false
}
function Read-GuardParent([string]$Target) {
    Assert-PlainAncestors ([IO.Path]::GetDirectoryName($Target))
    $exists = Test-Path -LiteralPath $Target
    $reparse = $false; $leaves = @(); $createdTicks = $null
    if ($exists) {
        $item = Get-Item -LiteralPath $Target -Force
        Assert-Guard $item.PSIsContainer 'parent_directory_required'
        $reparse = ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
        Assert-Guard (-not $reparse) 'parent_reparse_point'
        $createdTicks = $item.CreationTimeUtc.Ticks
        # Metadata only. Do not open socket contents or traverse descendants.
        $leaves = @(Get-ChildItem -LiteralPath $Target -Force | Sort-Object Name | ForEach-Object {
            @{ name = $_.Name; directory = $_.PSIsContainer; reparsePoint = ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0; linkType = [string]$_.LinkType; length = $(if ($_.PSIsContainer) { -1 } else { $_.Length }) }
        })
    }
    return @{ path = $Target; exists = $exists; reparsePoint = $reparse; creationTimeTicks = $createdTicks; readComplete = $true; leaves = $leaves }
}
function Read-DockerGuardState {
    Assert-Guard ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) 'windows_only'
    $paths = Get-GuardPaths $env:LOCALAPPDATA $env:ProgramData
    Assert-PlainAncestors $env:LOCALAPPDATA; Assert-PlainAncestors (Join-Path $env:ProgramData 'Roost')
    $processes = @(Get-Process | Where-Object { $_.ProcessName -match '^(?:Docker Desktop|DockerCli|docker|dockerd|vpnkit|com\.docker\..*)$' })
    $parents = @()
    foreach ($target in $paths.Parents) { $parents += Read-GuardParent $target }
    return @{ schemaVersion = 'roost-docker-runtime-observation-v1'; observedAt = [DateTime]::UtcNow.ToString('o'); localAppData = $env:LOCALAPPDATA; programData = $env:ProgramData; daemon = Get-DockerDaemonState; dockerProcesses = $processes.Count; processReadComplete = $true; writerAbsent = -not (Test-Path -LiteralPath $paths.Writer); recoveryAbsent = -not (Test-Path -LiteralPath $paths.Recovery); outstandingReceipt = Test-Path -LiteralPath (Join-Path $paths.Receipts 'active.json'); parents = $parents }
}
function Write-GuardReceipt([string]$File, $Value) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 20 -Compress))
    $stream = New-Object IO.FileStream($File, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
    Assert-Guard ([Convert]::ToBase64String([IO.File]::ReadAllBytes($File)) -ceq [Convert]::ToBase64String($bytes)) 'receipt_readback'
}
function Assert-OwnActiveReceipt([string]$File, [byte[]]$Expected) {
    $item = Get-Item -LiteralPath $File -Force
    Assert-Guard (-not $item.PSIsContainer -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 -and $item.Length -eq $Expected.Length -and $Expected.Length -lt 4096) 'active_receipt_physical_identity'
    Assert-Guard ([Convert]::ToBase64String([IO.File]::ReadAllBytes($File)) -ceq [Convert]::ToBase64String($Expected)) 'active_receipt_compare_and_swap'
}
function Invoke-DockerRuntimeGuard {
    $state = Read-DockerGuardState; $plan = Get-DockerGuardPlan $state $Recover.IsPresent $Start.IsPresent
    if ($plan.action -eq 'healthy_skip' -or $plan.action -eq 'inspect') { return @{ schemaVersion = 'roost-docker-runtime-guard-result-v1'; action = $plan.action; daemon = $state.daemon; dockerProcesses = $state.dockerProcesses; parentMetadataDigest = Get-GuardDigest $state.parents; reconciliationPending = $state.outstandingReceipt; mutations = 0; underlyingBugPrevented = $false } }
    $paths = Get-GuardPaths $env:LOCALAPPDATA $env:ProgramData; Assert-PlainAncestors $paths.Receipts
    [IO.Directory]::CreateDirectory($paths.Receipts) | Out-Null
    $id = [Guid]::NewGuid().ToString(); $active = Join-Path $paths.Receipts 'active.json'
    $intent = @{ schemaVersion = 'roost-docker-runtime-guard-intent-v1'; operationId = $id; createdAt = [DateTime]::UtcNow.ToString('o'); phase = 'intent'; action = $plan.action; originalParentDigest = Get-GuardDigest $state.parents; oldDataDeleted = $false }
    Write-GuardReceipt $active $intent
    $activeBytes = [IO.File]::ReadAllBytes($active)
    $renamed = 0
    try {
        for ($index = 0; $index -lt 2; $index++) {
            if (-not $plan.mutate -or -not $state.parents[$index].exists) { continue }
            $fresh = Read-DockerGuardState; $fresh.outstandingReceipt = $false
            Assert-OwnActiveReceipt $active $activeBytes
            $freshPlan = Get-DockerGuardPlan $fresh $true $false
            Assert-Guard ($freshPlan.action -eq 'quarantine_parents') 'daemon_changed_before_rename'
            # Only already-renamed parents may disappear; all untouched bytes/metadata must match.
            Assert-Guard ((Get-GuardDigest $fresh.parents[$index]) -eq (Get-GuardDigest $state.parents[$index])) 'parent_compare_before_rename'
            $source = $paths.Parents[$index]; $name = [IO.Path]::GetFileName($source) + '.roost-quarantine-' + $id
            $destination = Join-Path ([IO.Path]::GetDirectoryName($source)) $name
            Assert-Guard (-not (Test-Path -LiteralPath $destination)) 'quarantine_already_exists'
            Write-GuardReceipt (Join-Path $paths.Receipts ($id + '-rename-' + $index + '-intent.json')) @{ operationId = $id; parentIndex = $index; phase = 'rename_intent'; sourcePathDigest = Get-GuardDigest $source; destinationPathDigest = Get-GuardDigest $destination }
            Rename-Item -LiteralPath $source -NewName $name
            Assert-Guard (-not (Test-Path -LiteralPath $source) -and (Test-Path -LiteralPath $destination -PathType Container)) 'rename_outcome_uncertain'
            $preserved = Read-GuardParent $destination; $preserved.path = $source
            Assert-Guard ((Get-GuardDigest $preserved) -eq (Get-GuardDigest $state.parents[$index])) 'quarantined_metadata_changed'
            $renamed++
            Write-GuardReceipt (Join-Path $paths.Receipts ($id + '-rename-' + $index + '-readback.json')) @{ operationId = $id; parentIndex = $index; phase = 'parent_quarantined'; sourceAbsent = $true; destinationExists = $true; oldDataDeleted = $false }
        }
        if ($plan.start) {
            $fresh = Read-DockerGuardState; $fresh.outstandingReceipt = $false
            Assert-OwnActiveReceipt $active $activeBytes
            $freshPlan = Get-DockerGuardPlan $fresh $false $true
            Assert-Guard ($freshPlan.action -eq 'start_clean_missing_parents') 'daemon_changed_before_start'
            $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'; Assert-PlainAncestors $desktop
            Assert-Guard (Test-Path -LiteralPath $desktop -PathType Leaf) 'desktop_executable_missing'
            Write-GuardReceipt (Join-Path $paths.Receipts ($id + '-start-intent.json')) @{ operationId = $id; phase = 'normal_desktop_start_intent' }
            Start-Process -FilePath $desktop -WindowStyle Hidden | Out-Null
            $ready = Wait-DockerDaemonHealthy
            Assert-Guard $ready 'desktop_not_ready_within_60_seconds'
        }
        $finalDaemon = Get-DockerDaemonState
        if ($plan.start) { Assert-Guard ($finalDaemon -eq 'healthy') 'final_daemon_health_uncertain' }
        Write-GuardReceipt (Join-Path $paths.Receipts ($id + '-complete.json')) @{ operationId = $id; phase = 'complete'; completedAt = [DateTime]::UtcNow.ToString('o'); renamedParents = $renamed; normalStartRequested = $plan.start; daemon = $finalDaemon; oldDataDeleted = $false; underlyingBugPrevented = $false }
        # Preserve the durable marker by renaming it, never deleting it.
        Assert-OwnActiveReceipt $active $activeBytes
        Rename-Item -LiteralPath $active -NewName ($id + '-intent-complete.json')
        Assert-Guard (-not (Test-Path -LiteralPath $active) -and (Test-Path -LiteralPath (Join-Path $paths.Receipts ($id + '-intent-complete.json')) -PathType Leaf)) 'final_marker_outcome_uncertain'
        return @{ schemaVersion = 'roost-docker-runtime-guard-result-v1'; operationId = $id; action = $plan.action; renamedParents = $renamed; daemon = $finalDaemon; reconciliationPending = $false; oldDataDeleted = $false; underlyingBugPrevented = $false }
    } catch {
        # Retained active intent blocks every retry until actual state is reconciled.
        throw 'docker_runtime_guard_partial_or_uncertain_reconcile_required'
    }
}
if (-not $Library) { Invoke-DockerRuntimeGuard | ConvertTo-Json -Depth 10 -Compress }
