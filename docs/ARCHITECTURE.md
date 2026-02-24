# MX2LM + Supernaut Architecture Diagram

This document is the **living architecture diagram** for the repository.
Update this file whenever routing, layers, or interfaces change.

## System Overview

```mermaid
flowchart TD
    U[User Input] --> P[Supernaut Perception]
    P --> M[Supernaut Mind]
    M --> R[MX2LM Router]

    R --> E1[CODE Expert]
    R --> E2[REASON Expert]
    R --> E3[POLICY Expert]
    R --> E4[CLARIFY Expert]
    R --> E5[META Expert]

    E1 --> A[Supernaut Action]
    E2 --> A
    E3 --> A
    E4 --> A
    E5 --> A

    A --> O[Code / Explanation / Tests / Micronaut Path]

    C[Supernaut Core] --> M
    MEM[Supernaut Memory] --> M
    EVO[Supernaut Evolution] --> M
    B[Micronaut Body] --> O
```

## Layered Blueprint (Directory Mapping)

```mermaid
flowchart LR
    subgraph S[supernaut/]
      C[core/]
      CO[consciousness/]
      ME[memory/]
      PE[perception/]
      AC[action/]
      EV[evolution/]
      MI[micronauts/]
      SYS[system.py]
      API[api.py]
    end

    subgraph X[MX2LM PowerShell]
      K[Kuhul.psm1]
      EX[MX2LM-Expert.psm1]
      RO[MX2LM-Router.psm1]
      UI[MX2LM.psm1]
      MAN[moe-manifest.xjson]
    end

    MAN --> RO
    K --> EX
    EX --> RO
    RO --> SYS
    SYS --> API
```

## Diagram Update Log

- 2026-02-24: Initial living diagram added for merged MX2LM + Supernaut repository.
- 2026-02-24: Trinity runtime flow diagram added and linked to new shell/launcher files.

## How to update as we go

1. Update one or both Mermaid diagrams when topology changes.
2. Add one bullet to **Diagram Update Log** with date + summary.
3. If behavior changed, run tests and include command output in PR notes.


## Trinity runtime flow (updated)

```mermaid
flowchart TD
    XJ[XJSON Law
manifest.xjson] --> TS[TrinityShell.psm1]
    TS --> KK[Kuhul.psm1]
    KK --> MX[MX2LM Router + Experts]
    MX --> SN[Supernaut system.py]
    SN --> OUT[Response Artifacts]

    CLI[trinity.ps1] --> TS
```
