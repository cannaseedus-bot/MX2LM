Import-Module "$PSScriptRoot/Kuhul.psm1" -Force
Import-Module "$PSScriptRoot/MX2LM-Expert.psm1" -Force
Import-Module "$PSScriptRoot/MX2LM-Router.psm1" -Force

class MX2LM {
    [MX2LMRouter]$Router
    [hashtable]$Manifest
    [bool]$Verbose

    MX2LM([string]$manifestPath, [bool]$verbose = $false) {
        $this.Manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json -AsHashtable
        $this.Router = [MX2LMRouter]::new($this.Manifest)
        $this.Verbose = $verbose
    }

    [hashtable]Chat([string]$userMessage) {
        $this.Router.AddUserMessage($userMessage)
        $result = $this.Router.Route($userMessage)
        return $this.FormatResponse($result)
    }

    [hashtable]FormatResponse([hashtable]$routerResult) {
        $response = @{ Success = $true; Timestamp = Get-Date }

        if ($routerResult.Type -eq 'clarification_needed') {
            $response.NeedsClarification = $true
            $response.Message = $routerResult.Message
            $response.Questions = $routerResult.Questions
            $response.Suggestions = $routerResult.Suggestions
            $response.Analysis = $routerResult.Analysis
        } else {
            $response.NeedsClarification = $false
            $response.Strategy = $routerResult.Strategy
            $response.Experts = $routerResult.Experts ?? @($routerResult.Expert)

            switch ($routerResult.Strategy) {
                'single' {
                    $response.Content = $routerResult.Result.Content
                    $response.Confidence = $routerResult.Result.Confidence
                }
                'multi' {
                    $response.Content = $routerResult.Synthesis.MergedContent
                    $response.Confidence = $routerResult.Synthesis.CombinedConfidence
                }
                'cascade' {
                    $response.Content = $routerResult.FinalResult.Content
                    $response.CascadeSteps = $routerResult.CascadeResults.Count
                }
                'ensemble' {
                    $response.Content = $routerResult.Consensus
                    $response.ConsensusStrength = $routerResult.Consensus.ConsensusStrength
                }
            }
        }

        return $response
    }

    [void]PrintResponse([hashtable]$response) {
        if ($response.NeedsClarification) {
            Write-Host "`n🤔 $($response.Message)" -ForegroundColor Yellow
            Write-Host "`nQuestions:" -ForegroundColor Cyan
            foreach ($q in $response.Questions) {
                Write-Host "  • $q" -ForegroundColor White
            }
            if ($response.Suggestions) {
                Write-Host "`nOr did you mean:" -ForegroundColor Gray
                foreach ($s in $response.Suggestions) {
                    Write-Host "  → $s" -ForegroundColor DarkGray
                }
            }
        } else {
            $confidence = if ($null -ne $response.Confidence) { [Math]::Round($response.Confidence * 100, 1) } else { 'n/a' }
            Write-Host "`n✅ Response (via $($response.Experts -join ', '))" -ForegroundColor Green
            Write-Host "Strategy: $($response.Strategy) | Confidence: $confidence%" -ForegroundColor DarkGray
            Write-Host "`n$($response.Content)" -ForegroundColor White
        }
    }
}

function Start-MX2LM {
    param(
        [string]$ManifestPath = "$PSScriptRoot/moe-manifest.xjson"
    )

    $mx2lm = [MX2LM]::new($ManifestPath, $true)

    Write-Host @"

  ╭─────────────────────────────────────────────────────────────────╮
  │                                                                 │
  │   ███╗   ███╗██╗  ██╗██████╗ ██╗     ███╗   ███╗               │
  │   ████╗ ████║╚██╗██╔╝╚════██╗██║     ████╗ ████║               │
  │   ██╔████╔██║ ╚███╔╝  █████╔╝██║     ██╔████╔██║               │
  │   ██║╚██╔╝██║ ██╔██╗ ██╔═══╝ ██║     ██║╚██╔╝██║               │
  │   ██║ ╚═╝ ██║██╔╝ ██╗███████╗███████╗██║ ╚═╝ ██║               │
  │   ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚═╝               │
  │                                                                 │
  │   MIXTURE OF TRINITY EXPERTS                                    │
  │                                                                 │
  │   Experts: CODE | REASON | POLICY | CLARIFY | META             │
  │   Each expert: K'UHUL + PowerShell + XJSON                     │
  │                                                                 │
  │   Type 'exit' to quit | 'experts' to list | 'clear' to reset   │
  ╰─────────────────────────────────────────────────────────────────╯

"@ -ForegroundColor Cyan

    while ($true) {
        $input = Read-Host "`n⟁ mx2lm"

        if ($input -eq 'exit') { break }
        if ($input -eq 'clear') {
            $mx2lm = [MX2LM]::new($ManifestPath, $true)
            Write-Host '🔄 Context cleared' -ForegroundColor Yellow
            continue
        }
        if ($input -eq 'experts') {
            Write-Host "`nAvailable Experts:" -ForegroundColor Cyan
            foreach ($expert in $mx2lm.Router.Experts.Keys) {
                $e = $mx2lm.Router.Experts[$expert]
                Write-Host "  • $expert: $($e.Domain)" -ForegroundColor White
            }
            continue
        }

        $response = $mx2lm.Chat($input)
        $mx2lm.PrintResponse($response)
    }
}

Export-ModuleMember -Function Start-MX2LM
