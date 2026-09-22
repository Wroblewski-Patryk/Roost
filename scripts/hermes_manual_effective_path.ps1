# Match the pinned upstream Sync-EnvPath. Read registry values; never write them.
$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
$commands = @()
foreach ($name in @('git','uv','ssh','cmd','powershell')) {
    $command = Get-Command -Name $name -ErrorAction Stop
    $commands += @{name=$name; type=[string]$command.CommandType; path=$command.Path}
}
@{path=$env:Path; commands=$commands} | ConvertTo-Json -Depth 4 -Compress
