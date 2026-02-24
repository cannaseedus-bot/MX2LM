param(
    [ValidateSet('repl', 'validate')]
    [string]$Mode = 'repl',
    [string]$Manifest = './manifest.xjson'
)

Import-Module "$PSScriptRoot/Kuhul.psm1" -Force
Import-Module "$PSScriptRoot/TrinityShell.psm1" -Force

switch ($Mode) {
    'validate' {
        try {
            $manifestObj = Get-Content $Manifest -Raw | ConvertFrom-Json -AsHashtable
            [void][TrinityShell]::new($manifestObj)
            Write-Host "✅ Manifest valid" -ForegroundColor Green
        } catch {
            Write-Host "❌ Validation failed: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    }
    'repl' {
        Start-TrinityREPL -ManifestPath $Manifest
    }
}
