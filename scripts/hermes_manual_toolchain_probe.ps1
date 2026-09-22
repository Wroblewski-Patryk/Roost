# No downloads/installation. Only exact resolution, hash and local version/config queries.
$ErrorActionPreference = 'Stop'
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$failures = @(); $tools = @(); $modules = @(); $cmdlets = @()
foreach ($tool in $request.executables) {
    try {
        $item = Get-Item -LiteralPath $tool.path
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'tool_link' }
        if ((Get-FileHash -LiteralPath $tool.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $tool.sha256) { throw 'tool_hash' }
        if ($tool.command) {
            $resolved = Get-Command -Name $tool.command -ErrorAction Stop
            if ($resolved.CommandType -ne 'Application' -or $resolved.Path -ine $tool.path) { throw 'tool_resolution' }
        }
        $version = $item.VersionInfo.FileVersion
        if ($tool.versionArgs) {
            $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
            try { $version = (& $tool.path @($tool.versionArgs) 2>&1 | Out-String).Trim(); $code=$LASTEXITCODE }
            finally { $ErrorActionPreference = $old }
            if ($code -ne 0 -or $version.Length -gt 4096) { throw 'tool_version' }
            $version=($version -split "`r?`n")[0]
        }
        $tools += @{ name=$tool.name; path=$item.FullName; sha256=$tool.sha256; version=$version }
    } catch { $failures += @{name=$tool.name; reason='exact_tool_probe_failed'} }
}
foreach ($name in $request.commands) {
    try {
        $cmd = Get-Command -Name $name -ErrorAction Stop
        if ($cmd.CommandType -notin @('Cmdlet','Function')) { throw 'cmdlet_type' }
        $module = $cmd.Module
        if ($module) {
            $modulePath=$module.Path
            if (-not $modulePath.StartsWith($request.moduleRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'module_origin' }
            $modules += [pscustomobject]@{name=$module.Name; version=$module.Version.ToString(); path=$modulePath;
                sha256=(Get-FileHash -LiteralPath $modulePath -Algorithm SHA256).Hash.ToLowerInvariant()}
        } else {
            if ($cmd.PSSnapIn.Name -notlike 'Microsoft.PowerShell.*') { throw 'snapin_origin' }
            $assembly=$cmd.ImplementingType.Assembly.Location
            $modules += [pscustomobject]@{name=$cmd.PSSnapIn.Name;version=$cmd.PSSnapIn.Version.ToString();path=$assembly;
                sha256=(Get-FileHash -LiteralPath $assembly -Algorithm SHA256).Hash.ToLowerInvariant()}
        }
        $cmdlets += $name
    } catch { $failures += @{name=$name; reason='system_cmdlet_probe_failed'} }
}
$git = @($request.executables | Where-Object { $_.name -eq 'git' })
$gitConfig = $false
if ($git.Count -eq 1) {
    try {
        if (-not (Test-Path -LiteralPath $env:GIT_CONFIG_GLOBAL) -or (Get-Item -LiteralPath $env:GIT_CONFIG_GLOBAL).Length -ne 0) { throw 'gitconfig_not_empty' }
        $settings=@(& $git[0].path config --list)
        if ($LASTEXITCODE -ne 0 -or ($settings -join "`n") -ne "credential.helper=`ncore.askpass=") { throw 'gitconfig_unexpected' }
        $helper=@($request.executables | Where-Object { $_.name -eq 'git-remote-https' })
        if ($helper.Count -ne 1) { throw 'git_helper_missing' }
        $execPath=(& $git[0].path --exec-path).Trim().Replace('/','\')
        if ($LASTEXITCODE -ne 0 -or $execPath -ine (Split-Path -Parent $helper[0].path)) { throw 'git_helper_origin' }
        if ($env:GIT_TERMINAL_PROMPT -ne '0' -or $env:GCM_INTERACTIVE -ne 'never') { throw 'git_prompt' }
        $gitConfig=$true
    } catch { $failures += @{name='git_config';reason='private_git_config_failed'} }
}
@{result=$(if($failures.Count){'BLOCKED'}else{'PASS'});tools=$tools;
  modules=@($modules | Sort-Object name -Unique);cmdlets=$cmdlets;gitConfig=$gitConfig;failures=$failures} |
    ConvertTo-Json -Depth 8 -Compress
