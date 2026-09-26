param([ValidateSet('Install','InstallSupervised','Run','Start','Stop','Status','Handoff','StoreHandoffCredential')][string]$Action = 'Status')
$ErrorActionPreference = 'Stop'
$taskName = 'Roost Agent Host Observer'
# A direct user-profile directory is shared with Task Scheduler. Packaged-app
# LocalAppData virtualization can hide files from the Windows login process.
$stateDirectory = Join-Path $env:USERPROFILE '.roost\agent-host'
$configPath = Join-Path $stateDirectory 'agent-host.json'
$stopPath = Join-Path $stateDirectory 'stop.request'
$scriptPath = $PSCommandPath
$nodePath = 'C:\Program Files\nodejs\node.exe'
$runnerPath = Join-Path $PSScriptRoot 'roost-codex-agent-host.mjs'
$handoffPath = Join-Path $stateDirectory 'handoff.json'
$handoffClientPath = Join-Path $PSScriptRoot 'lib\agent-host-handoff-client.mjs'
$launcherPath = Join-Path $stateDirectory 'roost-agent-host-launcher.exe'

function Stop-RoostObserver {
  [IO.File]::WriteAllText($stopPath, 'stop')
  # A supervised start may be finishing its bounded 60-second native Hermes
  # inventory check before it observes the stop request.
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    if ((Get-ScheduledTask -TaskName $taskName).State -ne 'Running') { return }
    Start-Sleep -Milliseconds 1000
  }
  throw 'observer_stop_timeout; inspect status before restarting'
}

switch ($Action) {
  'Handoff' {
    if (-not (Test-Path -LiteralPath $handoffPath) -or -not (Test-Path -LiteralPath $configPath)) { throw 'handoff_binding_missing' }
    if (-not (Test-Path -LiteralPath $nodePath) -or -not (Test-Path -LiteralPath $handoffClientPath)) { throw 'handoff_client_missing' }
    $env:ROOST_AGENT_HANDOFF_CONFIG = $handoffPath
    $env:ROOST_AGENT_HOST_CONFIG = $configPath
    $env:ROOST_AGENT_HOST_WINDOWS_SCRIPT = $scriptPath
    try { & $nodePath $handoffClientPath; $handoffExitCode = $LASTEXITCODE }
    finally {
      Remove-Item Env:ROOST_AGENT_HANDOFF_CONFIG -ErrorAction SilentlyContinue
      Remove-Item Env:ROOST_AGENT_HOST_CONFIG -ErrorAction SilentlyContinue
      Remove-Item Env:ROOST_AGENT_HOST_WINDOWS_SCRIPT -ErrorAction SilentlyContinue
    }
    if ($handoffExitCode -ne 0) { exit $handoffExitCode }
  }
  'StoreHandoffCredential' {
    # Internal child action. Raw one-time key travels only over this process's
    # anonymous stdin pipe, never through arguments, environment or output.
    . (Join-Path $PSScriptRoot 'roost-agent-credential.ps1')
    $secret = [Console]::In.ReadToEnd()
    if ($secret -cnotmatch '^cc_v1_[A-Za-z0-9_-]{32}$') { throw 'handoff_credential_invalid' }
    $target = 'Roost/AgentHost/Supervised'
    try {
      $prior = [RoostCredential]::Read($target)
      if ($null -ne $prior) { throw 'handoff_credential_target_occupied' }
    } catch {
      $cause = $_.Exception
      while ($cause.InnerException) { $cause = $cause.InnerException }
      if ($cause.Message -ne 'credential_unavailable') { throw 'handoff_credential_target_occupied' }
    }
    [RoostCredential]::Write($target, 'roost-agent-host', $secret)
    $readback = [RoostCredential]::Read($target)
    $a = [Text.Encoding]::UTF8.GetBytes($secret)
    $b = [Text.Encoding]::UTF8.GetBytes($readback)
    try {
      $difference = $a.Length -bxor $b.Length
      for ($index = 0; $index -lt [Math]::Max($a.Length, $b.Length); $index++) {
        $left = if ($index -lt $a.Length) { $a[$index] } else { 0 }
        $right = if ($index -lt $b.Length) { $b[$index] } else { 0 }
        $difference = $difference -bor ($left -bxor $right)
      }
      if ($difference -ne 0) { throw 'handoff_credential_readback_failed' }
    } finally {
      [Array]::Clear($a, 0, $a.Length)
      [Array]::Clear($b, 0, $b.Length)
      $secret = $null
      $readback = $null
    }
    Write-Output 'credential_stored'
  }
  { $_ -in 'Install','InstallSupervised' } {
    if (-not (Test-Path -LiteralPath $configPath)) { throw 'observer_config_missing' }
    $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    $supervised = $Action -eq 'InstallSupervised'
    if ($config.executionMode -ne $(if ($supervised) { 'supervised' } else { 'observe' })) { throw 'host_mode_mismatch' }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $taskAction = New-ScheduledTaskAction -Execute $launcherPath -Argument ('"{0}"' -f $scriptPath) -WorkingDirectory $PSScriptRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
    $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
    . (Join-Path $PSScriptRoot 'lib\agent-host-windows-launcher.ps1')
    $installMutex = New-Object Threading.Mutex($false, 'Local\Roost.AgentHost.Install')
    $installOwned = $false
    $restart = $false
    $build = $null
    try {
      try { $installOwned = $installMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $installOwned = $true }
      if (-not $installOwned) { throw 'observer_install_already_running' }
      # Build successfully before interrupting an existing observer.
      $build = Build-RoostObserverLauncher (Join-Path $PSScriptRoot 'roost-agent-host-launcher.cs') $launcherPath
      $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
      $actionChanged = $existing -and ($existing.Actions.Count -ne 1 -or $existing.Actions[0].Execute -ne $launcherPath -or $existing.Actions[0].Arguments -ne $taskAction.Arguments)
      $observedMode = $null
      $statusPath = Join-Path $stateDirectory 'status.json'
      if (Test-Path -LiteralPath $statusPath) {
        try { $observedMode = (Get-Content -Raw -LiteralPath $statusPath | ConvertFrom-Json).executionMode } catch { $observedMode = $null }
      }
      $modeChanged = $supervised -or $observedMode -ne 'observe'
      if ($existing -and $existing.State -eq 'Running' -and ($build -or $actionChanged -or $modeChanged)) {
        Stop-RoostObserver
        $restart = $true
      }
      Publish-RoostObserverLauncher $build $launcherPath
      Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    } finally {
      try { if ($build -and (Test-Path -LiteralPath $build.PendingPath)) { Remove-Item -LiteralPath $build.PendingPath } }
      finally {
        try { if ($restart) { Start-ScheduledTask -TaskName $taskName } }
        finally { if ($installOwned) { $installMutex.ReleaseMutex() }; $installMutex.Dispose() }
      }
    }
    Write-Output $(if ($supervised) { 'Supervised host login task installed.' } else { 'Observer login task installed.' })
  }
  'Run' {
    $mutex = New-Object Threading.Mutex($false, 'Local\Roost.AgentHost.Launcher')
    $owned = $false
    try {
      try { $owned = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }
      if (-not $owned) { exit 0 }
      $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
      $roostObserverUri = $null
      $supervised = $config.executionMode -eq 'supervised'
      if ($config.executionMode -notin @('observe','supervised') -or -not [Uri]::TryCreate($config.baseUrl, [UriKind]::Absolute, [ref]$roostObserverUri) -or $roostObserverUri.Scheme -ne 'https' -or $roostObserverUri.UserInfo) { throw 'host_configuration_invalid' }
      if ($supervised -and ($config.executionProvider.kind -ne 'hermes_codex' -or $config.executionProvider.enabled -ne $true -or $null -eq $config.executionProvider.profile)) { throw 'supervised_provider_configuration_invalid' }
      if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath }
      . (Join-Path $PSScriptRoot 'roost-agent-credential.ps1')
      $startInfo = New-Object Diagnostics.ProcessStartInfo
      $startInfo.FileName = $nodePath
      $startInfo.Arguments = '"' + $runnerPath + '"'
      $startInfo.UseShellExecute = $false
      $startInfo.CreateNoWindow = $true
      $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
      $startInfo.EnvironmentVariables['ROOST_BASE_URL'] = $config.baseUrl
      $startInfo.EnvironmentVariables['ROOST_AGENT_HOST_CONFIG'] = $configPath
      $credentialTarget = if ($supervised) { 'Roost/AgentHost/Supervised' } else { 'Roost/AgentHost/Observer' }
      $startInfo.EnvironmentVariables['ROOST_AGENT_API_KEY'] = [RoostCredential]::Read($credentialTarget)
      $child = [Diagnostics.Process]::Start($startInfo)
      $startInfo.EnvironmentVariables.Remove('ROOST_AGENT_API_KEY')
      $child.WaitForExit()
      $childExitCode = $child.ExitCode
      $child.Dispose()
      exit $childExitCode
    } catch {
      # Fixed diagnostics only: never serialize exceptions or credential objects.
      [IO.File]::WriteAllText((Join-Path $stateDirectory 'launcher-status.txt'), 'observer_launch_failed; check credential and configuration')
      exit 1
    } finally {
      if ($owned) { $mutex.ReleaseMutex() }
      $mutex.Dispose()
    }
  }
  'Start' { Start-ScheduledTask -TaskName $taskName; Write-Output 'Observer start requested.' }
  'Stop' { Stop-RoostObserver; Write-Output 'Observer stopped; production expires the heartbeat within 60 seconds.' }
  'Status' {
    $task = Get-ScheduledTask -TaskName $taskName
    $info = Get-ScheduledTaskInfo -TaskName $taskName
    $status = $null
    if (Test-Path -LiteralPath (Join-Path $stateDirectory 'status.json')) { $status = Get-Content -Raw -LiteralPath (Join-Path $stateDirectory 'status.json') | ConvertFrom-Json }
    [PSCustomObject]@{ TaskName = $taskName; State = [string]$task.State; LastRunTime = $info.LastRunTime; LastTaskResult = $info.LastTaskResult; Host = $status } | ConvertTo-Json -Depth 5
  }
}
