# Reference Atomic Runtime Appendix (Non-Authoritative)

> **REFERENCE IMPLEMENTATION (NON-AUTHORITATIVE)**
> This code exists solely to demonstrate that the runtime laws are executable.
> It has no authority over semantics.

## Scope

This appendix captures a single, bounded execution sketch for an atomic runtime that respects the ASX-R runtime law, Atomic Block language, Atomic CSS runtime, and SCXQ2 binding constraints. It is intentionally limited to pseudocode and deterministic control flow so it cannot be mistaken for operational guidance.

## Execution Envelope

* **Inputs**: normalized `@block_plan`, `@css_bundle`, `@binding_table`, and `@state_snapshot` values already validated by the authoritative schemas.
* **Outputs**: `@render_tree` plus `@proof` hashes that bind plan, CSS, binding table, and state.
* **Determinism**: all steps are pure functions over the provided inputs; no implicit I/O, no ambient clock usage.

## Pseudocode (Single-Threaded Reference)

```
function execute_atomic_runtime(inputs):
  assert inputs conforms to atomic.runtime.contract.v1

  plan_hash      = H(normalize(inputs.@block_plan))
  css_hash       = H(normalize(inputs.@css_bundle))
  binding_hash   = H(normalize(inputs.@binding_table))
  state_hash     = H(normalize(inputs.@state_snapshot))

  css_ast        = atomic_css.parse(inputs.@css_bundle)
  css_resolved   = atomic_css.resolve(css_ast)

  block_ast      = atomic_block.parse(inputs.@block_plan)
  bound_blocks   = scxq2.bind(block_ast, inputs.@binding_table)

  evaluation_ctx = {
    @bindings: bound_blocks,
    @state: inputs.@state_snapshot,
    @styles: css_resolved
  }

  render_tree    = atomic_block.evaluate(evaluation_ctx)
  layout_tree    = atomic_css.layout(render_tree, css_resolved)

  proof = {
    @plan_hash:    plan_hash,
    @css_hash:     css_hash,
    @binding_hash: binding_hash,
    @state_hash:   state_hash,
    @render_hash:  H(normalize(render_tree)),
    @layout_hash:  H(normalize(layout_tree))
  }

  return { @render_tree: render_tree, @layout_tree: layout_tree, @proof: proof }
```

## Conformance Notes

* Every referenced module (`atomic_css`, `atomic_block`, `scxq2`) is the same logical component described in the authoritative law and schemas; no new semantics are introduced here.
* Hashing uses the canonical normalization rules already defined in the law; alternative hash functions are out of scope.
* No persistence, network access, or timers are allowed in this reference path.
* Any alternative implementation is conformant if and only if it produces identical outputs for identical normalized inputs and emits the same proof tuple.
