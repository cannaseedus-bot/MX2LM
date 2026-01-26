# KUHUL Surface → π/AST Lowering Contract

This contract defines how non-authoritative surfaces (KUHUL-ES, SVG metadata, JSON payloads, CLI scripts) are deterministically lowered into π/AST under XCFE. Only the lowered π/AST is authoritative.

## Authority rules
- π/AST is authoritative only after XCFE validation.
- Surface syntaxes are non-authoritative; they must deterministically lower into π/AST.
- Any transport or UI plane (SVG, KPI envelopes, web UI) is a projection surface, not execution law.

## Deterministic lowering pipeline
1. **Parse surface** into a normalized surface AST with stable ordering.
2. **Validate** against the surface schema (if provided).
3. **Lower** into π/AST using a fixed, deterministic mapping.
4. **Validate** the π/AST under XCFE rules.
5. **Execute** only the validated π/AST.

## Surface input expectations
- All IDs must be stable or derived deterministically from content.
- No hidden state: the surface input must be complete and self-contained.
- Numeric fields must use explicit precision rules (no implicit casting).

## Minimal lowering example
Surface (example JSON):
```json
{
  "surface": "kuhul-es",
  "op": "emit_task",
  "task": "Define surface-to-π AST lowering contract"
}
```

Lowered π/AST (example JSON):
```json
{
  "@type": "pi.ast",
  "v": 1,
  "op": "emit_task",
  "args": {
    "task": "Define surface-to-π AST lowering contract"
  }
}
```

## PHP-first control plane (cPanel) + optional local runners
The hosting surface starts as PHP (cPanel API + CLI). PHP is the primary server control plane,
while other runtimes are optional local tools that must still lower deterministically into π/AST.

- **PHP (server control plane)**: `php ai_agent.php --complete-first`
- **Python (local/dev)**: `python3 tools/kuhul_pi_runner.py --complete-first`
- **Node.js (optional)**: `node tools/kuhul_pi_runner.js --complete-first`
- **Shell (optional)**: `./tools/kuhul_pi_runner.sh --complete-first`

Any of these are valid so long as they deterministically lower into π/AST and pass XCFE validation.

## Example artifacts
- Surface input: `examples/kuhul_surface_task.json`
- Lowered π/AST: `examples/kuhul_surface_task.pi.json`
