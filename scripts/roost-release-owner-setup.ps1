param([string]$StateDirectory=(Join-Path $env:USERPROFILE '.roost\agent-host'))
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'roost-agent-credential.ps1')
$taskRepository=Split-Path $PSScriptRoot -Parent
$taskBinding=Get-Content -Raw -LiteralPath (Join-Path $StateDirectory 'handoff.json') | ConvertFrom-Json
$taskReceipt=Join-Path $StateDirectory 'gate3-recovery-ack.json'
$taskKey=Join-Path $StateDirectory 'gate3-backup-restore.key'
$taskSettingsFile=Join-Path $StateDirectory 'gate3-owner-prerequisites.json'
function Invoke-OwnerSetup($taskInput) {
 $taskReply=($taskInput | ConvertTo-Json -Compress) | node (Join-Path $PSScriptRoot 'roost-release-owner-setup.mjs')
 if($LASTEXITCODE -ne 0){throw 'release_owner_setup_failed'}
 return ($taskReply | ConvertFrom-Json)
}
function Read-OwnerSecret([string]$taskPrompt) {
 $taskSecure=Read-Host $taskPrompt -AsSecureString
 $taskPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure)
 try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer)}
 finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer)}
}
try {
 $taskRegistry=Read-OwnerSecret 'GitHub classic PAT for this certification (repo, read:packages, write:packages, delete:packages for owned test-image cleanup); input is hidden'
 if($taskRegistry -notmatch '^[A-Za-z0-9_]{20,255}$'){throw 'registry_credential_invalid'}
 [RoostCredential]::Write('Roost/Gate3/Registry','governed-release',$taskRegistry)
 $taskFolder=Read-Host 'Owner-designated laptop folder for the one latest encrypted Roost backup (absolute path outside repositories)'
 $taskFolder=[IO.Path]::GetFullPath($taskFolder)
 $taskRelative=$taskFolder.StartsWith($taskRepository.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)
 if($taskRelative -or $taskFolder -eq $taskRepository -or $taskFolder -eq $StateDirectory){throw 'backup_private_folder_required'}
 if(-not(Test-Path -LiteralPath $taskFolder)){New-Item -ItemType Directory -Path $taskFolder | Out-Null}
 $taskCommon=@{installationId=$taskBinding.installationId;repositoryRoot=$taskRepository;receiptFile=$taskReceipt}
 if(-not(Test-Path -LiteralPath $taskReceipt)){
  $taskGenerate=@{}+$taskCommon;$taskGenerate.command='generate'
  $taskGenerated=Invoke-OwnerSetup $taskGenerate
  Write-Host 'One-time recovery code. Store it outside BOTH laptop and VPS, for example on paper:'
  Write-Host $taskGenerated.code
  $taskCode=$taskGenerated.code;$taskChallenge=$taskGenerated.challengeId
 }else{
  $taskExisting=Get-Content -Raw -LiteralPath $taskReceipt | ConvertFrom-Json
  if(-not $taskExisting.acknowledgedAt){$taskCode=Read-OwnerSecret 'Enter the previously displayed recovery code';$taskChallenge=$taskExisting.challengeId}
 }
 if($taskCode){
  if((Read-Host 'Confirm that the recovery code is stored outside laptop and VPS: type YES') -cne 'YES'){throw 'off_device_ack_required'}
  $taskAck=@{}+$taskCommon;$taskAck.command='ack';$taskAck.challengeId=$taskChallenge;$taskAck.code=$taskCode
  Invoke-OwnerSetup $taskAck | Out-Null
 }
 $taskKeyInput=@{}+$taskCommon;$taskKeyInput.command='key';$taskKeyInput.keyFile=$taskKey
 Invoke-OwnerSetup $taskKeyInput | Out-Null
 @{installationId=$taskBinding.installationId;laptopFolder=$taskFolder;restoreKeyFile=$taskKey;recoveryAcknowledgmentFile=$taskReceipt;registryCredentialTarget='Roost/Gate3/Registry'} | ConvertTo-Json | Set-Content -LiteralPath $taskSettingsFile -Encoding UTF8
 Write-Host 'Gate 3 private prerequisites prepared. No token or recovery code was saved in Roost records.'
}finally{$taskRegistry=$null;$taskCode=$null;$taskGenerated=$null;$taskAck=$null}
