# TrinityShell.psm1 — orchestration layer for Trinity Architecture
Import-Module "$PSScriptRoot/Kuhul.psm1" -Force

class TrinityShell {
    [KuhulKernel]$Kernel
    [hashtable]$Manifest
    [hashtable]$Routes
    [hashtable]$Lexicon

    TrinityShell([hashtable]$manifest) {
        $this.Kernel = $Global:Kuhul
        $this.Manifest = $manifest
        $this.Routes = @{}
        $this.Lexicon = @{}
        $this.ValidateManifest()
        $this.InitFromManifest()
        $this.InitDefaultLexicon()
    }

    [void]ValidateManifest() {
        foreach ($field in @('@context', '@identity', '@runtime')) {
            if (-not $this.Manifest.ContainsKey($field)) {
                throw "XJSON LAW VIOLATION: missing $field"
            }
        }
    }

    [void]InitFromManifest() {
        if ($this.Manifest.'@schema'.'api'.'@routes') {
            foreach ($route in $this.Manifest.'@schema'.'api'.'@routes'.GetEnumerator()) {
                $this.Routes[$route.Key] = $route.Value
            }
        }
    }

    [void]InitDefaultLexicon() {
        $this.Lexicon['status'] = {
            @{
                routes = $this.Routes.Count
                memory = $this.Kernel.Memory.Count
                mode = $this.Kernel.ControlPlane.Mode
            } | ConvertTo-Json
        }

        $this.Lexicon['mem'] = {
            param($path)
            if ($path) { return ($this.Kernel.Yax($path) | ConvertTo-Json -Depth 6) }
            return ($this.Kernel.Memory | ConvertTo-Json -Depth 4)
        }

        $this.Lexicon['calc'] = {
            param($input)
            $parts = $input -split '\s+'
            if ($parts.Count -lt 3) { return 'usage: calc <op> <a> <b>' }
            return $this.Kernel.Sek($parts[0], @([double]$parts[1], [double]$parts[2]))
        }
    }

    [object]Execute([string]$commandLine) {
        $parts = $commandLine -split '\s+', 2
        $cmd = $parts[0]
        $arg = if ($parts.Count -gt 1) { $parts[1] } else { $null }

        if ($this.Lexicon.ContainsKey($cmd)) {
            return & $this.Lexicon[$cmd] $arg
        }

        throw "Unknown command: $cmd"
    }
}

function New-TrinityShell {
    param([Parameter(Mandatory)][string]$ManifestPath)
    $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json -AsHashtable
    return [TrinityShell]::new($manifest)
}

function Start-TrinityREPL {
    param([string]$ManifestPath = "$PSScriptRoot/manifest.xjson")
    $shell = New-TrinityShell -ManifestPath $ManifestPath

    Write-Host "⟁ Trinity REPL (K'UHUL + PowerShell + XJSON). type 'exit' to quit." -ForegroundColor Cyan
    while ($true) {
        $input = Read-Host "`n⟁ trinity"
        if ($input -eq 'exit') { break }
        try {
            $result = $shell.Execute($input)
            if ($null -ne $result) { Write-Host $result -ForegroundColor Green }
        } catch {
            Write-Host "❌ $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Export-ModuleMember -Function New-TrinityShell, Start-TrinityREPL
