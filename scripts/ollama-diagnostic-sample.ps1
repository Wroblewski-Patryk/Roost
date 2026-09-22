param([int]$RootProcessId=0,[int]$AdditionalRootProcessId=0)
$ErrorActionPreference='Stop'
$memory=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory
$page=@(Get-CimInstance Win32_PageFileUsage | Select-Object AllocatedBaseSize,CurrentUsage,PeakUsage)
$allProcesses=@(Get-CimInstance Win32_Process)
$byId=@{};foreach($entry in $allProcesses){$byId[[uint32]$entry.ProcessId]=$entry}
$owned=[System.Collections.Generic.HashSet[uint32]]::new()
if($RootProcessId -gt 0){[void]$owned.Add([uint32]$RootProcessId)}else{
  foreach($entry in $allProcesses | Where-Object {$_.Name -in @('ollama.exe','llama-server.exe')}){[void]$owned.Add([uint32]$entry.ProcessId)}
}
if($AdditionalRootProcessId -gt 0){[void]$owned.Add([uint32]$AdditionalRootProcessId)}
do{$added=$false;foreach($entry in $allProcesses){
  $parent=$byId[[uint32]$entry.ParentProcessId]
  if($parent -and $entry.CreationDate -ge $parent.CreationDate -and $owned.Contains([uint32]$entry.ParentProcessId) -and $owned.Add([uint32]$entry.ProcessId)){$added=$true}
}}while($added)
$processes=@($allProcesses | Where-Object {$owned.Contains([uint32]$_.ProcessId)} | ForEach-Object {
  [pscustomobject]@{name=$_.Name;pid=$_.ProcessId;parentPid=$_.ParentProcessId;workingSetBytes=[long]$_.WorkingSetSize;privateBytes=[long]$_.PrivatePageCount;createdAt=$_.CreationDate.ToUniversalTime().ToString('o')}
})
$gpu=@(& nvidia-smi --query-gpu=memory.total,memory.free,memory.used --format=csv,noheader,nounits)
[pscustomobject]@{recordedAt=[DateTime]::UtcNow.ToString('o');availableBytes=[long]$memory.AvailableBytes;committedBytes=[long]$memory.CommittedBytes;commitLimitBytes=[long]$memory.CommitLimit;pagesPerSecond=[long]$memory.PagesPersec;pagefile=$page;processes=$processes;gpuMiB=$gpu} | ConvertTo-Json -Depth 5 -Compress
