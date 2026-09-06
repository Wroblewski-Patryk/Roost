$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\agent-host-windows-launcher.ps1')
function Assert-Launcher($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
# A login task cannot see packaged-app LocalAppData/Temp virtualization.
$directory = Join-Path $env:USERPROFILE ('.roost launcher test ' + [guid]::NewGuid())
[IO.Directory]::CreateDirectory($directory) | Out-Null
$executable = Join-Path $directory 'launcher.exe'
$fixture = Join-Path $directory 'fixture with spaces.ps1'
$records = Join-Path $directory 'records.jsonl'
$taskName = 'Roost Observer Launcher Test ' + [guid]::NewGuid()
$taskCreated = $false
$process = $null
try {
  $build = Build-RoostObserverLauncher (Join-Path $PSScriptRoot 'roost-agent-host-launcher.cs') $executable
  Publish-RoostObserverLauncher $build $executable
  $bytes = [IO.File]::ReadAllBytes($executable)
  $pe = [BitConverter]::ToInt32($bytes, 0x3c)
  Assert-Launcher ([BitConverter]::ToUInt16($bytes, $pe + 24 + 68) -eq 2) 'launcher_must_be_windows_gui_subsystem'
  Write-Output 'PASS GUI PE subsystem: no initial console allocation'
  $hash = Get-RoostLauncherHash $executable
  Assert-Launcher ($null -eq (Build-RoostObserverLauncher (Join-Path $PSScriptRoot 'roost-agent-host-launcher.cs') $executable)) 'unchanged_build_must_be_noop'
  Assert-Launcher ((Get-RoostLauncherHash $executable) -eq $hash) 'unchanged_binary_modified'
  Write-Output 'PASS unchanged installation is idempotent'
  $sourceCopy = Join-Path $directory 'launcher-source.cs'
  [IO.File]::WriteAllText($sourceCopy, ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'roost-agent-host-launcher.cs')) + "`n// synthetic upgrade"))
  $upgrade = Build-RoostObserverLauncher $sourceCopy $executable
  Assert-Launcher ($null -ne $upgrade) 'changed_source_not_rebuilt'
  Publish-RoostObserverLauncher $upgrade $executable
  Assert-Launcher ($null -eq (Build-RoostObserverLauncher $sourceCopy $executable)) 'updated_binary_not_reusable'
  Write-Output 'PASS source update replaces the same binary and becomes idempotent'
  $hash = Get-RoostLauncherHash $executable
  [IO.File]::WriteAllText($sourceCopy, 'invalid synthetic C# source')
  $failed = $false
  try { Build-RoostObserverLauncher $sourceCopy $executable | Out-Null } catch { $failed = $true }
  Assert-Launcher ($failed -and (Get-RoostLauncherHash $executable) -eq $hash -and -not (Test-Path -LiteralPath ($executable + '.pending.exe'))) 'failed_build_changed_existing_binary'
  Write-Output 'PASS compiler failure preserves the working binary and removes pending output'
  [IO.File]::WriteAllText($fixture, @'
param([string]$Action)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class ConsoleProbe { [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); }'
$file = Join-Path $PSScriptRoot 'records.jsonl'
$attempt = if (Test-Path -LiteralPath $file) { @(Get-Content -LiteralPath $file).Count + 1 } else { 1 }
$record = @{ attempt = $attempt; pid = $PID; action = $Action; console = [ConsoleProbe]::GetConsoleWindow().ToInt64(); cwd = [Environment]::CurrentDirectory }
[IO.File]::AppendAllText($file, (($record | ConvertTo-Json -Compress) + [Environment]::NewLine))
Start-Sleep -Milliseconds 1000
if ((Test-Path -LiteralPath (Join-Path $PSScriptRoot 'fail-once')) -and $attempt -eq 1) { exit 17 }
exit 0
'@)
  # Launch the GUI executable as the shell would: no windowsHide workaround.
  $start = New-Object Diagnostics.ProcessStartInfo
  $start.FileName = $executable
  $start.Arguments = '"' + $fixture + '"'
  $start.UseShellExecute = $true
  $process = [Diagnostics.Process]::Start($start)
  Assert-Launcher ($process.WaitForExit(15000)) 'fixture_timeout'
  Assert-Launcher ($process.ExitCode -eq 0) 'fixture_failed'
  $record = Get-Content -Raw -LiteralPath $records | ConvertFrom-Json
  Assert-Launcher ($record.console -eq 0 -and $record.action -eq 'Run' -and $record.cwd -eq $directory) 'hidden_child_or_quoted_arguments_failed'
  $process.Dispose(); $process = $null
  Write-Output 'PASS shell launch, quoted path, waiting and native GetConsoleWindow=0'
  Remove-Item -LiteralPath $records
  [IO.File]::WriteAllText((Join-Path $directory 'fail-once'), 'synthetic failure')
  $process = [Diagnostics.Process]::Start($start)
  Assert-Launcher ($process.WaitForExit(15000)) 'failure_fixture_timeout'
  Assert-Launcher ($process.ExitCode -eq 17) 'failure_exit_code_not_propagated'
  $process.Dispose(); $process = $null
  Write-Output 'PASS child failure propagates unchanged to scheduler'
  Remove-Item -LiteralPath $records
  Remove-Item -LiteralPath (Join-Path $directory 'fail-once')
  # RestartOnFailure retries action-start failures (MS-TSCH 2.5.4.2).
  # A nonzero child exit alone did not trigger it on the supported Windows host.
  # Initially omit only this synthetic task's executable, then publish it for
  # the scheduler's own retry. Never kill or alter the real observer.
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $scheduledExecutable = Join-Path $directory 'scheduled-launcher.exe'
  $action = New-ScheduledTaskAction -Execute $scheduledExecutable -Argument ('"' + $fixture + '"') -WorkingDirectory $directory
  $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
  $triggers = @((New-ScheduledTaskTrigger -AtLogOn -User $identity), (New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(8)))
  $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -Hidden -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Trigger $triggers -Settings $settings -Force | Out-Null
  $taskCreated = $true
  $failureDeadline = [DateTime]::UtcNow.AddSeconds(25)
  do {
    Start-Sleep -Milliseconds 250
    $failureInfo = Get-ScheduledTaskInfo -TaskName $taskName
  } while ($failureInfo.LastTaskResult -ne 2147942402 -and [DateTime]::UtcNow -lt $failureDeadline)
  Assert-Launcher ($failureInfo.LastTaskResult -eq 2147942402) 'synthetic_action_start_failure_not_observed'
  [IO.File]::Copy($executable, $scheduledExecutable)
  $deadline = [DateTime]::UtcNow.AddSeconds(100)
  do {
    Start-Sleep -Milliseconds 250
    $lines = if (Test-Path -LiteralPath $records) { @(Get-Content -LiteralPath $records) } else { @() }
    if ($lines.Count -ge 1 -and (Get-ScheduledTask -TaskName $taskName).State -ne 'Running') { break }
  } while ([DateTime]::UtcNow -lt $deadline)
  if ($lines.Count -ne 1) {
    $info = Get-ScheduledTaskInfo -TaskName $taskName
    throw ('scheduler_did_not_restart_exactly_once: attempts={0}; result={1}' -f $lines.Count, $info.LastTaskResult)
  }
  foreach ($line in $lines) { Assert-Launcher (($line | ConvertFrom-Json).console -eq 0) 'scheduler_child_allocated_console' }
  Assert-Launcher ((Get-ScheduledTaskInfo -TaskName $taskName).LastTaskResult -eq 0) 'scheduler_restart_did_not_succeed'
  Write-Output 'PASS native Task Scheduler automatic retry after action-start failure: console handle zero'
  $start.Arguments = '"' + (Join-Path $directory 'missing.ps1') + '"'
  $process = [Diagnostics.Process]::Start($start)
  Assert-Launcher ($process.WaitForExit(5000) -and $process.ExitCode -eq 1) 'invalid_path_did_not_fail_closed'
  $process.Dispose(); $process = $null
  Write-Output 'PASS missing target fails without a popup'
} finally {
  if ($taskCreated) { Stop-ScheduledTask -TaskName $taskName; Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
  if ($process) { if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() }; $process.Dispose() }
  # Only exact files created by this fixture, no recursive cleanup or real state.
  foreach ($name in @('launcher.exe','launcher.exe.build.json','launcher.exe.pending.exe','scheduled-launcher.exe','launcher-source.cs','fixture with spaces.ps1','records.jsonl','fail-once')) {
    $file = Join-Path $directory $name
    if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
  }
  [IO.Directory]::Delete($directory)
}
