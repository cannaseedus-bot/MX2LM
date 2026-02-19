# Brains topology assets

Canonical topology schemas and bindings live in `brains/topologies/`.

## Canonical source files

Use these files as the source of truth:

- `brains/topologies/brain_topology_bindings.schema.json`
- `brains/topologies/brain_topology_bindings.svg.json`
- `brains/topologies/brain_topology_registry.json`
- `brains/topologies/schema.model.binding.json`
- `brains/topologies/schema.shell.*.json`

## Compatibility mirrors

Legacy paths under `brains/` for duplicated topology schema files are now lightweight pointer files (`@type: mx2lm.pointer.v1`) that declare `@canonical` targets in `brains/topologies/`.

These mirrored files are **not generated artifacts** and should not be edited as schema sources.

## Validation

Run canonical validation from repository root:

```bash
python tools/validate_brains.py
```

The validator loads schema, bindings, and registry from `brains/topologies/`.
