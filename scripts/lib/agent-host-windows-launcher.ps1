function Get-RoostLauncherHash([string]$Path) {
  $algorithm = [Security.Cryptography.SHA256]::Create()
  $stream = [IO.File]::OpenRead($Path)
  try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '') }
  finally { $stream.Dispose(); $algorithm.Dispose() }
}

function Build-RoostObserverLauncher([string]$SourcePath, [string]$OutputPath) {
  $stampPath = $OutputPath + '.build.json'
  $sourceHash = Get-RoostLauncherHash $SourcePath
  if ((Test-Path -LiteralPath $OutputPath) -and (Test-Path -LiteralPath $stampPath)) {
    try {
      $stamp = Get-Content -Raw -LiteralPath $stampPath | ConvertFrom-Json
      if ($stamp.sourceHash -eq $sourceHash -and $stamp.binaryHash -eq (Get-RoostLauncherHash $OutputPath)) { return $null }
    } catch { } # Rebuild corrupt/incomplete metadata; never trust it as executable code.
  }
  $compiler = Join-Path $env:SystemRoot 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  if (-not (Test-Path -LiteralPath $compiler)) { throw 'observer_launcher_compiler_missing' }
  $pendingPath = $OutputPath + '.pending.exe'
  $start = New-Object Diagnostics.ProcessStartInfo
  $start.FileName = $compiler
  $start.Arguments = '/nologo /target:winexe /optimize+ /out:"{0}" "{1}"' -f $pendingPath, $SourcePath
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  try {
    $compilerProcess = [Diagnostics.Process]::Start($start)
    # Consume both streams without copying compiler/source details to logs.
    $output = $compilerProcess.StandardOutput.ReadToEndAsync()
    $errors = $compilerProcess.StandardError.ReadToEndAsync()
    if (-not $compilerProcess.WaitForExit(30000)) { $compilerProcess.Kill(); throw 'observer_launcher_compile_timeout' }
    if ($compilerProcess.ExitCode -ne 0) { throw 'observer_launcher_compile_failed' }
    return [PSCustomObject]@{ PendingPath = $pendingPath; SourceHash = $sourceHash; BinaryHash = (Get-RoostLauncherHash $pendingPath) }
  } catch {
    if (Test-Path -LiteralPath $pendingPath) { Remove-Item -LiteralPath $pendingPath }
    throw
  } finally { if ($compilerProcess) { $compilerProcess.Dispose() } }
}

function Publish-RoostObserverLauncher($Build, [string]$OutputPath) {
  if (-not $Build) { return }
  if (Test-Path -LiteralPath $OutputPath) { [IO.File]::Replace($Build.PendingPath, $OutputPath, [NullString]::Value) }
  else { [IO.File]::Move($Build.PendingPath, $OutputPath) }
  [IO.File]::WriteAllText(($OutputPath + '.build.json'), (@{ sourceHash = $Build.SourceHash; binaryHash = $Build.BinaryHash } | ConvertTo-Json))
}
