param(
    [Parameter(Mandatory=$true)][string]$Installer,
    [Parameter(Mandatory=$true)][string]$InstallDir,
    [Parameter(Mandatory=$true)][string]$InstallationHome,
    [Parameter(Mandatory=$true)][string]$Commit
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$stageName = 'target'
$outputBytes = 0
try {
    if ($Commit -ne 'a3d7f9ae257d5db6bb9759a10c437d786eec1610') { throw 'pin' }
    if ((Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne '226a342a3f409a0e3b6a716b3ba4d464f286adc1e7356d08edd3ff33d6b35e39') { throw 'installer' }
    if (Test-Path -LiteralPath $InstallDir) { throw 'target_exists' }
    $common = @('-InstallDir', $InstallDir, '-HermesHome', $InstallationHome, '-Commit', $Commit, '-Branch', 'main')
    $paths = (& $Installer @common -ShowResolvedPaths | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or $paths.install_dir -cne $InstallDir -or $paths.hermes_home -cne $InstallationHome) { throw 'target_changed' }
    foreach ($stageName in @('repository', 'python', 'venv', 'dependencies')) {
        if ($stageName -eq 'venv' -and (Test-Path -LiteralPath (Join-Path $InstallDir 'venv'))) { throw 'unexpected_existing_venv' }
        @{ type='start'; stage=$stageName } | ConvertTo-Json -Compress | Write-Output
        $script:stageFrame = $null
        & $Installer @common -Stage $stageName -NonInteractive -Json *>&1 | ForEach-Object {
            $line = $_.ToString()
            $script:outputBytes += [Text.Encoding]::UTF8.GetByteCount($line)
            if ($script:outputBytes -gt 2097152) { throw 'installer_output_limit' }
            try { $frame = $line | ConvertFrom-Json -ErrorAction Stop } catch { $frame = $null }
            if ($null -ne $frame -and $frame.stage -eq $stageName -and $frame.ok -is [bool]) {
                if ($null -ne $script:stageFrame) { throw 'duplicate_frame' }
                $script:stageFrame = $frame
            }
            # Only known fallback labels leave the process, never raw installer logs.
            if ($line -match 'SSH failed, trying HTTPS') { @{type='fallback';stage=$stageName;kind='https'} | ConvertTo-Json -Compress | Write-Output }
            if ($line -match 'Git clone failed -- downloading ZIP') { @{type='fallback';stage=$stageName;kind='zip'} | ConvertTo-Json -Compress | Write-Output }
            if ($line -match 'Trying managed Python fallback (3\.[0-9]+)') { @{type='fallback';stage=$stageName;kind=('python-'+$Matches[1])} | ConvertTo-Json -Compress | Write-Output }
            if ($line -match 'falling back to PyPI resolve') { @{type='fallback';stage=$stageName;kind='pypi-resolve'} | ConvertTo-Json -Compress | Write-Output }
        }
        $code = $LASTEXITCODE
        $frame = $script:stageFrame
        if ($null -eq $frame -or $code -ne 0 -or $frame.ok -ne $true -or $frame.skipped -ne $false) { throw 'stage_failed' }
        @{type='stage';stage=$stageName;ok=$true;skipped=$false;exitCode=$code} | ConvertTo-Json -Compress | Write-Output
    }
    @{type='complete';ok=$true} | ConvertTo-Json -Compress | Write-Output
    exit 0
} catch {
    @{type='failed';stage=$stageName;reason='official_install_failed_closed'} | ConvertTo-Json -Compress | Write-Output
    exit 1
}
