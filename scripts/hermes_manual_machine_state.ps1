$ErrorActionPreference='Stop'
$values=@()
foreach($scope in @('User','Machine')) {
    foreach($name in @('Path','HERMES_HOME','HERMES_GIT_BASH_PATH')) {
        $values+= @($scope,$name,[Environment]::GetEnvironmentVariable($name,$scope)) -join ':'
    }
}
foreach($key in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Run','HKLM:\Software\Microsoft\Windows\CurrentVersion\Run')) {
    if(Test-Path -LiteralPath $key) {
        $item=Get-Item -LiteralPath $key
        foreach($name in @($item.GetValueNames() | Sort-Object)) {$values+=@($key,$name,[string]$item.GetValue($name)) -join ':'}
    }
}
foreach($folder in @([Environment]::GetFolderPath('Startup'),[Environment]::GetFolderPath('CommonStartup'))) {
    if(Test-Path -LiteralPath $folder) {
        foreach($file in @(Get-ChildItem -LiteralPath $folder -File | Sort-Object Name)) {
            $values+=@($folder,$file.Name,(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash) -join ':'
        }
    }
}
$bytes=[Text.Encoding]::UTF8.GetBytes(($values -join "`n"))
$hash=[Security.Cryptography.SHA256]::Create()
try { [BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-','').ToLowerInvariant() } finally {$hash.Dispose()}
