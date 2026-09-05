param([ValidateSet('Install','Run','Start','Stop','Status')][string]$Action = 'Status')
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
$powershellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

function Stop-RoostObserver {
  [IO.File]::WriteAllText($stopPath, 'stop')
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if ((Get-ScheduledTask -TaskName $taskName).State -ne 'Running') { return }
    Start-Sleep -Milliseconds 1000
  }
  throw 'observer_stop_timeout; inspect status before restarting'
}

switch ($Action) {
  'Install' {
    if (-not (Test-Path -LiteralPath $configPath)) { throw 'observer_config_missing' }
    $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    if ($config.executionMode -ne 'observe') { throw 'observer_mode_required' }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $taskAction = New-ScheduledTaskAction -Execute $powershellPath -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "{0}" -Action Run' -f $scriptPath) -WorkingDirectory $PSScriptRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
    $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
    Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Output 'Observer login task installed.'
  }
  'Run' {
    $mutex = New-Object Threading.Mutex($false, 'Local\Roost.AgentHost.Launcher')
    $owned = $false
    try {
      try { $owned = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }
      if (-not $owned) { exit 0 }
      $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
      if ($config.executionMode -ne 'observe' -or $config.baseUrl -ne 'https://api.roost.luckysparrow.ch') { throw 'observer_configuration_invalid' }
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
      $startInfo.EnvironmentVariables['ROOST_AGENT_API_KEY'] = [RoostCredential]::Read('Roost/AgentHost/Observer')
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
