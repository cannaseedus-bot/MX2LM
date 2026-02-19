# systems/oracle-ports

## Purpose
Boundary and interoperability ports that expose oracle-oriented APIs and ASX bridging surfaces.

## Authoritative entrypoints
- `systems/oracle-ports/oracle/` (primary oracle implementation)
- `systems/oracle-ports/oracle-js/` (JavaScript oracle adapter/port)
- `systems/oracle-ports/asx/` (ASX bridge and related protocol artifacts)

## Maturity / status
Integration-heavy surface; maturity varies by port. Treated as compatibility infrastructure between core law and external consumers.

## Dependencies
Depends on `systems/core-spec/` contracts and on runtime layers where adapters call into execution logic.

## Relationship to ASX/MX2LM core law
Implements externally visible interpretations of core law; must not introduce semantics that conflict with core-spec invariants.
