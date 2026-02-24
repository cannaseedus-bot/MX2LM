class MX2LMRouter {
    [hashtable]$Experts
    [hashtable]$Manifest
    [array]$ConversationHistory
    [hashtable]$UserContext

    MX2LMRouter([hashtable]$manifest) {
        $this.Manifest = $manifest
        $this.Experts = @{}
        $this.ConversationHistory = @()
        $this.UserContext = @{}
        $this.InitializeExperts()
    }

    [void]InitializeExperts() {
        foreach ($expertConfig in $this.Manifest['@experts'].GetEnumerator()) {
            $expert = [TrinityExpert]::new($expertConfig.Value)
            $this.Experts[$expertConfig.Key] = $expert
        }

        Write-Host "✅ Initialized $($this.Experts.Count) Trinity Experts" -ForegroundColor Green
    }

    [hashtable]Route([string]$input) {
        $context = @{
            PreviousMessages = $this.ConversationHistory | Select-Object -Last 5
            UserContext = $this.UserContext
            TechnicalContext = $this.InferTechnicalContext($input)
        }

        $clarifyExpert = $this.Experts['CLARIFY']
        $clarifyAnalysis = $clarifyExpert.AnalyzeInput($input, $context)

        if ($clarifyAnalysis.NeedsClarification -and $clarifyAnalysis.Confidence -lt 0.5) {
            return $this.HandleClarification($clarifyExpert, $input, $context, $clarifyAnalysis)
        }

        $expertScores = @{}
        foreach ($expertName in $this.Experts.Keys) {
            $expert = $this.Experts[$expertName]
            $expertScores[$expertName] = $expert.ScoreRelevance($input, $context)
        }

        $topExperts = $expertScores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3
        $routingStrategy = $this.DetermineRoutingStrategy($topExperts, $input)

        switch ($routingStrategy) {
            'single' { return $this.ExecuteSingleExpert($topExperts[0].Key, $input, $context) }
            'multi' { return $this.ExecuteMultiExpert($topExperts, $input, $context) }
            'cascade' { return $this.ExecuteCascade($topExperts, $input, $context) }
            'ensemble' { return $this.ExecuteEnsemble($topExperts, $input, $context) }
            default { return @{ Error = 'No routing strategy matched' } }
        }
    }

    [hashtable]HandleClarification([TrinityExpert]$expert, [string]$input, [hashtable]$context, [hashtable]$analysis) {
        $questions = $expert.GenerateClarifyingQuestions($analysis)
        $response = @{
            Type = 'clarification_needed'
            Message = 'I want to make sure I understand your request correctly.'
            Questions = $questions
            Analysis = @{
                DetectedIntent = $analysis.Intent
                Confidence = $analysis.Confidence
                Ambiguities = $analysis.Ambiguities.Count
            }
            Suggestions = $this.GenerateSuggestions($input, $analysis)
        }

        $this.ConversationHistory += @{ Role = 'assistant'; Type = 'clarification'; Content = $response; Timestamp = Get-Date }
        return $response
    }

    [array]GenerateSuggestions([string]$input, [hashtable]$analysis) {
        $suggestions = @()
        switch ($analysis.Intent) {
            'generate' {
                $suggestions += 'Are you asking me to write new code?'
                $suggestions += 'Should I create a complete implementation or a template?'
            }
            'explain' {
                $suggestions += 'Would you like a high-level overview or detailed explanation?'
                $suggestions += 'Should I include examples?'
            }
            'fix' {
                $suggestions += 'Can you share the error message or unexpected behavior?'
                $suggestions += 'Is this a syntax error or a logic issue?'
            }
            'decide' {
                $suggestions += 'What are the main factors in your decision?'
                $suggestions += 'Are there constraints I should consider?'
            }
        }
        return $suggestions
    }

    [string]DetermineRoutingStrategy($topExperts, [string]$input) {
        $topScore = $topExperts[0].Value
        $secondScore = if ($topExperts.Count -gt 1) { $topExperts[1].Value } else { 0 }

        if ($topScore - $secondScore -gt 0.3) { return 'single' }

        if ($topScore -gt 0.6 -and $secondScore -gt 0.5) {
            $expert1 = $topExperts[0].Key
            $expert2 = $topExperts[1].Key
            if ($this.AreComplementary($expert1, $expert2)) { return 'cascade' }
            return 'multi'
        }

        if ($topScore -lt 0.5) { return 'ensemble' }
        return 'single'
    }

    [bool]AreComplementary([string]$expert1, [string]$expert2) {
        $complementaryPairs = @(
            @('CODE', 'REASON'), @('CODE', 'POLICY'), @('REASON', 'POLICY'), @('META', 'CODE'), @('CLARIFY', 'CODE')
        )

        foreach ($pair in $complementaryPairs) {
            if (($pair -contains $expert1) -and ($pair -contains $expert2)) { return $true }
        }
        return $false
    }

    [hashtable]ExecuteSingleExpert([string]$expertName, [string]$input, [hashtable]$context) {
        $expert = $this.Experts[$expertName]
        $result = $expert.Process($input, $context)
        $this.ConversationHistory += @{ Role = 'assistant'; Expert = $expertName; Content = $result; Timestamp = Get-Date }
        return @{ Strategy = 'single'; Expert = $expertName; Result = $result }
    }

    [hashtable]ExecuteMultiExpert($topExperts, [string]$input, [hashtable]$context) {
        $results = @{}
        foreach ($expertEntry in $topExperts) {
            $expert = $this.Experts[$expertEntry.Key]
            $results[$expertEntry.Key] = $expert.Process($input, $context)
        }

        return @{ Strategy = 'multi'; Experts = ($topExperts | ForEach-Object { $_.Key }); Results = $results; Synthesis = $this.SynthesizeResults($results) }
    }

    [hashtable]ExecuteCascade($topExperts, [string]$input, [hashtable]$context) {
        $cascadeResults = @()
        $currentContext = $context

        foreach ($expertEntry in $topExperts) {
            $expert = $this.Experts[$expertEntry.Key]
            $result = $expert.Process($input, $currentContext)
            $cascadeResults += @{ Expert = $expertEntry.Key; Result = $result }

            if ($result.Type -eq 'response') {
                $currentContext = $currentContext.Clone()
                $currentContext.PreviousExpertOutput = $result.Content
            }
        }

        return @{ Strategy = 'cascade'; CascadeResults = $cascadeResults; FinalResult = $cascadeResults[-1].Result }
    }

    [hashtable]ExecuteEnsemble($topExperts, [string]$input, [hashtable]$context) {
        $results = @{}
        foreach ($expertEntry in $topExperts) {
            $expert = $this.Experts[$expertEntry.Key]
            $results[$expertEntry.Key] = $expert.Process($input, $context)
        }

        return @{ Strategy = 'ensemble'; Experts = ($topExperts | ForEach-Object { $_.Key }); Results = $results; Consensus = $this.FindConsensus($results) }
    }

    [hashtable]SynthesizeResults([hashtable]$results) {
        $synthesis = @{ CombinedConfidence = 0.0; MergedContent = ''; ContributingExperts = @() }
        $count = 0

        foreach ($expertName in $results.Keys) {
            $result = $results[$expertName]
            if ($result.Type -eq 'response') {
                $synthesis.CombinedConfidence += $result.Confidence
                $count++
                $synthesis.ContributingExperts += $expertName
                $synthesis.MergedContent += "`n[$expertName]: $($result.Content)"
            }
        }

        if ($count -gt 0) {
            $synthesis.CombinedConfidence /= $count
        }

        return $synthesis
    }

    [hashtable]FindConsensus([hashtable]$results) {
        $consensus = @{ AgreedPoints = @(); DisagreedPoints = @(); ConfidenceDistribution = @{} }

        foreach ($expertName in $results.Keys) {
            $consensus.ConfidenceDistribution[$expertName] = $results[$expertName].Confidence
        }

        $confidences = $consensus.ConfidenceDistribution.Values
        $avgConfidence = ($confidences | Measure-Object -Average).Average
        $stdDev = [Math]::Sqrt((($confidences | ForEach-Object { [Math]::Pow($_ - $avgConfidence, 2) } | Measure-Object -Average).Average))

        $consensus.ConsensusStrength = if ($stdDev -lt 0.1) { 'high' } elseif ($stdDev -lt 0.2) { 'medium' } else { 'low' }
        return $consensus
    }

    [hashtable]InferTechnicalContext([string]$input) {
        $context = @{ Languages = @(); Frameworks = @(); Domains = @() }
        $languages = @{
            python = 'Python'; javascript = 'JavaScript'; typescript = 'TypeScript'; powershell = 'PowerShell'; rust = 'Rust'; go = 'Go'; java = 'Java'; 'csharp|c#' = 'C#'
        }

        foreach ($pattern in $languages.Keys) {
            if ($input -match "\b$pattern\b") {
                $context.Languages += $languages[$pattern]
            }
        }

        return $context
    }

    [void]AddUserMessage([string]$message) {
        $this.ConversationHistory += @{ Role = 'user'; Content = $message; Timestamp = Get-Date }
    }
}
