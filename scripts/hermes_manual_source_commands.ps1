# Parse only: never dot-source or execute the upstream installer.
param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'source_parse' }
$functions = @{}
$ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true) |
    ForEach-Object { $functions[$_.Name] = $_ }
$queue = New-Object 'System.Collections.Generic.Queue[string]'
@('Set-LongProfileEnvVars','ConvertTo-LongPath','Get-LongProfileRoot','Get-InstallStage',
  'Step-OutOfInstallDir','Invoke-Stage','Stage-Repository','Stage-Python','Stage-Venv','Stage-Dependencies') |
    ForEach-Object { $queue.Enqueue($_) }
$seen = @{}; $commands = @(); $launches = @(); $pathWrites = @(); $ssh = @()
while ($queue.Count) {
    $name = $queue.Dequeue()
    if ($seen[$name]) { continue }
    if (-not $functions.ContainsKey($name)) { throw 'source_function_missing' }
    $seen[$name] = $true
    $body = $functions[$name].Body
    foreach ($command in $body.FindAll({ param($n) $n -is [System.Management.Automation.Language.CommandAst] }, $true)) {
        $literal = $command.GetCommandName()
        if ($literal -and $functions.ContainsKey($literal)) { $queue.Enqueue($literal) }
        else {
            $commands += @{ function=$name; line=$command.Extent.StartLineNumber;
                name=$literal; head=$command.CommandElements[0].Extent.Text }
        }
    }
    foreach ($assignment in $body.FindAll({ param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] }, $true)) {
        $lhs = $assignment.Left.Extent.Text
        $row = @{ function=$name; line=$assignment.Extent.StartLineNumber; value=$assignment.Right.Extent.Text }
        if ($lhs -ieq '$env:Path') { $pathWrites += $row }
        if ($lhs -match '\.FileName$') { $launches += $row }
        if ($lhs -ieq '$env:GIT_SSH_COMMAND') { $ssh += $row }
    }
}
@{ functions=@($seen.Keys | Sort-Object); commands=$commands; processLaunches=$launches;
   pathWrites=$pathWrites; sshCommands=$ssh } | ConvertTo-Json -Depth 8 -Compress
