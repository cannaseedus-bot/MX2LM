class TrinityExpert {
    [string]$Id
    [string]$Domain
    [hashtable]$Weights
    [array]$Triggers
    [array]$ClarifyingQuestions
    [KuhulKernel]$Kernel
    [hashtable]$Memory

    TrinityExpert([hashtable]$config) {
        $this.Id = $config['@id']
        $this.Domain = $config['@domain']
        $this.Weights = $config['@weights']
        $this.Triggers = $config['@triggers']
        $this.ClarifyingQuestions = $config['@clarifying_questions']
        $this.Kernel = [KuhulKernel]::new()
        $this.Memory = @{}
        $this.InitializeExpertMemory()
    }

    [void]InitializeExpertMemory() {
        $this.Kernel.Chen('expert.id', $this.Id)
        $this.Kernel.Chen('expert.domain', $this.Domain)
        $this.Kernel.Chen('expert.weights', $this.Weights)
    }

    [double]ScoreRelevance([string]$input, [hashtable]$context) {
        $score = 0.0
        $inputLower = $input.ToLower()

        foreach ($trigger in $this.Triggers) {
            if ($inputLower -match [regex]::Escape($trigger.ToLower())) {
                $score += 0.2
            }
        }

        $domainScore = $this.Kernel.Sek('mul', @(
            ($this.Weights['@semantic_understanding'] ?? 0.8),
            $this.AnalyzeSemanticFit($input)
        ))

        $score += $domainScore
        return [Math]::Min(1.0, $score)
    }

    [double]AnalyzeSemanticFit([string]$input) {
        $tokens = $input -split '\s+'
        $domainTokens = $this.GetDomainTokens()
        $matches = 0

        foreach ($token in $tokens) {
            if ($domainTokens -contains $token.ToLower()) {
                $matches++
            }
        }

        return $matches / [Math]::Max(1, $tokens.Length)
    }

    [array]GetDomainTokens() {
        switch ($this.Id) {
            'expert.code' {
                return @('code', 'function', 'class', 'implement', 'build', 'create', 'write', 'program', 'script', 'api', 'method', 'variable', 'loop', 'condition', 'array', 'object', 'string', 'number', 'bug', 'fix', 'error', 'debug', 'test', 'deploy')
            }
            'expert.reason' {
                return @('why', 'how', 'because', 'therefore', 'hence', 'thus', 'explain', 'analyze', 'compare', 'contrast', 'prove', 'logic', 'reason', 'argument', 'evidence', 'conclusion', 'premise', 'inference', 'deduce', 'infer')
            }
            'expert.policy' {
                return @('should', 'must', 'policy', 'rule', 'guideline', 'standard', 'comply', 'governance', 'regulation', 'best', 'practice', 'strategy', 'plan', 'decide', 'choose', 'recommend')
            }
            'expert.clarify' {
                return @('what', 'which', 'who', 'where', 'when', 'how', 'mean', 'specific', 'exactly', 'clarify', 'explain', 'context', 'detail', 'elaborate')
            }
            'expert.meta' {
                return @('you', 'yourself', 'system', 'improve', 'optimize', 'capability', 'limitation', 'reflect', 'meta', 'process', 'thinking', 'reasoning', 'approach')
            }
            default { return @() }
        }
    }

    [hashtable]Process([string]$input, [hashtable]$context) {
        $this.Kernel.Pop($this.Id)
        $this.Kernel.Chen('input.raw', $input)
        $this.Kernel.Chen('input.context', $context)

        $analysis = $this.AnalyzeInput($input, $context)

        if ($analysis.NeedsClarification) {
            return @{
                Type = 'clarification'
                Questions = $this.GenerateClarifyingQuestions($analysis)
                Confidence = $analysis.Confidence
                Expert = $this.Id
            }
        }

        $response = $this.GenerateResponse($input, $context, $analysis)
        $this.Kernel.Xul()

        return @{
            Type = 'response'
            Content = $response
            Confidence = $analysis.Confidence
            Expert = $this.Id
            Reasoning = $analysis.Reasoning
        }
    }

    [hashtable]AnalyzeInput([string]$input, [hashtable]$context) {
        $analysis = @{
            Intent = $this.DetectIntent($input)
            Entities = $this.ExtractEntities($input)
            Ambiguities = $this.DetectAmbiguities($input)
            MissingContext = $this.IdentifyMissingContext($input, $context)
            Confidence = 0.0
            NeedsClarification = $false
            Reasoning = @()
        }

        $ambiguityPenalty = $analysis.Ambiguities.Count * 0.15
        $missingContextPenalty = $analysis.MissingContext.Count * 0.2
        $baseConfidence = $this.Weights['@semantic_understanding'] ?? 0.8

        $analysis.Confidence = [Math]::Max(0.1, $baseConfidence - $ambiguityPenalty - $missingContextPenalty)
        $analysis.NeedsClarification = ($analysis.Confidence -lt 0.6 -or $analysis.Ambiguities.Count -gt 2 -or $analysis.MissingContext.Count -gt 1)

        return $analysis
    }

    [string]DetectIntent([string]$input) {
        $inputLower = $input.ToLower()
        $patterns = @{
            generate = 'write|create|build|implement|generate|make'
            explain  = 'explain|why|how|what is|describe'
            fix      = 'fix|debug|error|bug|problem|issue'
            review   = 'review|check|analyze|evaluate|assess'
            decide   = 'should|recommend|suggest|best|choose'
            clarify  = 'mean|specific|exactly|clarify'
        }

        foreach ($intent in $patterns.Keys) {
            if ($inputLower -match $patterns[$intent]) {
                return $intent
            }
        }

        return 'general'
    }

    [array]ExtractEntities([string]$input) {
        $entities = @()

        [regex]::Matches($input, '"([^"]+)"') | ForEach-Object {
            $entities += @{ Type = 'quoted'; Value = $_.Groups[1].Value }
        }

        [regex]::Matches($input, '`([^`]+)`') | ForEach-Object {
            $entities += @{ Type = 'code'; Value = $_.Groups[1].Value }
        }

        [regex]::Matches($input, '[\w./\\]+\.\w+') | ForEach-Object {
            $entities += @{ Type = 'file'; Value = $_.Value }
        }

        return $entities
    }

    [array]DetectAmbiguities([string]$input) {
        $ambiguities = @()
        $inputLower = $input.ToLower()
        $vaguePatterns = @{
            it = 'Unclear reference: "it"'
            this = 'Unclear reference: "this"'
            that = 'Unclear reference: "that"'
            them = 'Unclear reference: "them"'
            something = 'Vague term: "something"'
            stuff = 'Vague term: "stuff"'
            thing = 'Vague term: "thing"'
        }

        foreach ($pattern in $vaguePatterns.Keys) {
            if ($inputLower -match "\b$pattern\b") {
                $ambiguities += @{ Type = 'vague_reference'; Term = $pattern; Message = $vaguePatterns[$pattern] }
            }
        }

        if ($inputLower -match '\bor\b') {
            $ambiguities += @{ Type = 'disjunction'; Message = 'Multiple options presented - which do you prefer?' }
        }

        return $ambiguities
    }

    [array]IdentifyMissingContext([string]$input, [hashtable]$context) {
        $missing = @()
        $inputLower = $input.ToLower()

        if ($inputLower -match '\b(the|my|our)\s+\w+' -and -not $context.PreviousMessages) {
            $missing += @{ Type = 'assumed_context'; Message = 'References something not yet discussed' }
        }

        $technicalTerms = @('api', 'database', 'server', 'framework', 'library')
        foreach ($term in $technicalTerms) {
            if ($inputLower -match "\b$term\b" -and -not $context.TechnicalContext) {
                $missing += @{ Type = 'technical_context'; Term = $term; Message = "Technical term '$term' used without specification" }
            }
        }

        return $missing
    }

    [array]GenerateClarifyingQuestions([hashtable]$analysis) {
        $questions = @()

        foreach ($ambiguity in $analysis.Ambiguities) {
            switch ($ambiguity.Type) {
                'vague_reference' {
                    $questions += "When you say '$($ambiguity.Term)', what specifically are you referring to?"
                }
                'disjunction' {
                    $questions += 'You mentioned multiple options. Which would you prefer, or should I address all of them?'
                }
            }
        }

        foreach ($missing in $analysis.MissingContext) {
            switch ($missing.Type) {
                'assumed_context' {
                    $questions += "Could you provide more context about what you're working on?"
                }
                'technical_context' {
                    $questions += "Which specific $($missing.Term) are you referring to? (name, technology, version)"
                }
            }
        }

        if ($questions.Count -lt 2 -and $this.ClarifyingQuestions) {
            $relevantQuestions = $this.ClarifyingQuestions | Select-Object -First (2 - $questions.Count)
            $questions += $relevantQuestions
        }

        return $questions
    }

    [string]GenerateResponse([string]$input, [hashtable]$context, [hashtable]$analysis) {
        $response = "[$($this.Domain)] Processing: $input`n"
        $response += "Intent: $($analysis.Intent)`n"
        $response += "Confidence: $($analysis.Confidence)`n"
        return $response
    }
}
