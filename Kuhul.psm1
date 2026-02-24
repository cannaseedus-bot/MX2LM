# Kuhul.psm1 — Trinity compute kernel
# Purposefully dependency-light: no numpy/pytorch dependency chain.

class KuhulKernel {
    [hashtable]$Memory
    [hashtable]$Registers
    [hashtable]$Functions
    [hashtable]$TensorMaps
    [System.Collections.Stack]$CallStack
    [hashtable]$ControlPlane

    KuhulKernel() {
        $this.Memory = @{}
        $this.Registers = @{}
        $this.Functions = @{}
        $this.TensorMaps = @{}
        $this.CallStack = [System.Collections.Stack]::new()
        $this.ControlPlane = @{
            PC = 0
            SP = 0
            Mode = 'kernel'
            Flags = @{}
        }
        $this.InitBuiltins()
    }

    [void]Pop([string]$symbol) {
        $this.CallStack.Push(@{ Symbol = $symbol; Frame = @{}; Result = $null })
        $this.ControlPlane.PC++
        $this.ControlPlane.SP = $this.CallStack.Count
    }

    [void]Wo([string]$name, $value) {
        if ($this.CallStack.Count -eq 0) {
            $this.Registers[$name] = $value
            return
        }
        $frame = $this.CallStack.Peek()
        $frame.Frame[$name] = $value
    }

    [object]Yax([string]$path) {
        $parts = $path -split '\.'
        $current = $this.Memory
        foreach ($part in $parts) {
            if ($null -eq $current) { return $null }
            if ($current -is [hashtable]) {
                $current = $current[$part]
            } else {
                return $null
            }
        }
        return $current
    }

    [void]Chen([string]$path, $value) {
        $parts = $path -split '\.'
        $current = $this.Memory
        for ($i = 0; $i -lt $parts.Length - 1; $i++) {
            $part = $parts[$i]
            if (-not $current.ContainsKey($part)) {
                $current[$part] = @{}
            }
            $current = $current[$part]
        }
        $current[$parts[-1]] = $value
    }

    [object]Sek([string]$operation, [array]$args) {
        if ($this.Functions.ContainsKey($operation)) {
            return $this.Call($operation, $args)
        }

        switch ($operation) {
            'add' { return $args[0] + $args[1] }
            'sub' { return $args[0] - $args[1] }
            'mul' { return $args[0] * $args[1] }
            'div' { return $args[0] / $args[1] }
            'pow' { return [Math]::Pow($args[0], $args[1]) }
            'sqrt' { return [Math]::Sqrt($args[0]) }
            'eq' { return $args[0] -eq $args[1] }
            'gt' { return $args[0] -gt $args[1] }
            'lt' { return $args[0] -lt $args[1] }
            'and' { return $args[0] -and $args[1] }
            'or' { return $args[0] -or $args[1] }
            'len' { return $args[0].Length }
            'sum' { return ($args[0] | Measure-Object -Sum).Sum }
            'avg' { return ($args[0] | Measure-Object -Average).Average }
            'now' { return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
            'uuid' { return [guid]::NewGuid().ToString() }
            default { throw "Unknown operation: $operation" }
        }
    }

    [object]Xul() {
        if ($this.CallStack.Count -eq 0) { return $null }
        $frame = $this.CallStack.Pop()
        $this.ControlPlane.SP = $this.CallStack.Count
        return $frame.Result
    }

    [string]TensorCreate([int[]]$shape, [string]$dtype = 'float32') {
        $id = "tensor_" + [guid]::NewGuid().ToString().Substring(0, 8)
        $size = 1
        foreach ($d in $shape) { $size *= $d }

        $this.TensorMaps[$id] = @{
            Shape = $shape
            Dtype = $dtype
            Size = $size
            Data = [double[]]::new($size)
        }
        return $id
    }

    [void]TensorFill([string]$id, [double]$value) {
        $t = $this.TensorMaps[$id]
        for ($i = 0; $i -lt $t.Size; $i++) { $t.Data[$i] = $value }
    }

    [string]TensorAdd([string]$a, [string]$b) {
        $ta = $this.TensorMaps[$a]
        $tb = $this.TensorMaps[$b]
        if ($ta.Shape.Length -ne $tb.Shape.Length) { throw 'Tensor rank mismatch' }
        $result = $this.TensorCreate($ta.Shape, $ta.Dtype)
        $tr = $this.TensorMaps[$result]
        for ($i = 0; $i -lt $ta.Size; $i++) { $tr.Data[$i] = $ta.Data[$i] + $tb.Data[$i] }
        return $result
    }

    [void]Define([string]$name, [string[]]$params, [scriptblock]$body) {
        $this.Functions[$name] = @{ Params = $params; Body = $body }
    }

    [object]Call([string]$name, [array]$args) {
        $func = $this.Functions[$name]
        if (-not $func) { throw "Unknown function: $name" }

        $this.Pop($name)
        for ($i = 0; $i -lt $func.Params.Length; $i++) {
            $this.Wo($func.Params[$i], $args[$i])
        }

        $result = & $func.Body
        $frame = $this.CallStack.Peek()
        $frame.Result = $result
        return $this.Xul()
    }

    [object]ExecuteXJSON([hashtable]$xjson) {
        foreach ($key in $xjson.Keys) {
            if (-not $key.StartsWith('@')) { continue }
            $value = $xjson[$key]
            switch -Regex ($key) {
                '^@mem\.read$' { return $this.Yax($value.'@path') }
                '^@mem\.write$' {
                    $this.Chen($value.'@path', $this.ResolveValue($value.'@value'))
                    return $true
                }
                '^@op$' {
                    $args = $xjson.'@args' | ForEach-Object { $this.ResolveValue($_) }
                    return $this.Sek($value, $args)
                }
                '^@call$' {
                    $args = $value.'@args' | ForEach-Object { $this.ResolveValue($_) }
                    return $this.Call($value.'@function', $args)
                }
                '^@tensor\.create$' { return $this.TensorCreate($value.'@shape', $value.'@dtype') }
                '^@tensor\.fill$' { $this.TensorFill($value.'@id', [double]$value.'@value'); return $true }
                '^@tensor\.add$' { return $this.TensorAdd($value.'@a', $value.'@b') }
                '^@return$' { return $this.ResolveValue($value) }
            }
        }
        return $null
    }

    [object]ResolveValue($value) {
        if ($value -is [string] -and $value -match '^\{\{(.+)\}\}$') {
            $path = $Matches[1].Trim()
            if ($this.CallStack.Count -gt 0) {
                $frame = $this.CallStack.Peek()
                if ($frame.Frame.ContainsKey($path)) { return $frame.Frame[$path] }
            }
            return $this.Yax($path)
        }
        return $value
    }

    [void]InitBuiltins() {
        $this.Chen('math.pi', [Math]::PI)
        $this.Chen('math.e', [Math]::E)
        $this.Chen('sys.version', 'trinity-kernel-1.0.0')
        $this.Chen('sys.mode', 'dependency-light')
    }
}

$Global:Kuhul = [KuhulKernel]::new()

function Invoke-Kuhul {
    param(
        [Parameter(Mandatory)]
        [hashtable]$XJSON
    )

    return $Global:Kuhul.ExecuteXJSON($XJSON)
}

Export-ModuleMember -Function Invoke-Kuhul -Variable Kuhul
