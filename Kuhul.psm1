class KuhulKernel {
    [hashtable]$Memory
    [string]$CurrentScope

    KuhulKernel() {
        $this.Memory = @{}
        $this.CurrentScope = 'root'
    }

    [void]Pop([string]$scope) {
        $this.CurrentScope = $scope
    }

    [void]Chen([string]$key, $value) {
        $scopedKey = "$($this.CurrentScope).$key"
        $this.Memory[$scopedKey] = $value
    }

    [object]Sek([string]$operation, [object[]]$args) {
        switch ($operation) {
            'mul' {
                $result = 1.0
                foreach ($arg in $args) {
                    $result *= [double]$arg
                }
                return $result
            }
            'add' {
                $result = 0.0
                foreach ($arg in $args) {
                    $result += [double]$arg
                }
                return $result
            }
            default {
                throw "Unsupported Sek operation: $operation"
            }
        }
    }

    [void]Xul() {
        $this.CurrentScope = 'root'
    }
}
