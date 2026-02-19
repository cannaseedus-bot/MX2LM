# K'UHUL Query Language (KQL)

KQL bridges Kuhul control flow and inference data by providing a deterministic lexer, parser, executor, and compressor. The canonical implementation is authored in TypeScript at `runtime/kql.ts` and is designed to operate directly against IndexedDB while applying SCXQ2-inspired compression primitives.

## KQL Architecture

- **Canonical source path**: `runtime/kql.ts`.
- **Generated/runtime targets**:
  - `runtime/kql.js` is the generated JavaScript runtime artifact built from `runtime/kql.ts` via `npm run build:kql`.
  - `src/kql_engine.js` is a thin compatibility adapter that delegates lexer/parser/executor behavior to the generated runtime module.
- **Contribution rule**: all KQL language logic changes (tokenization, parsing, execution semantics, compression behavior) must land in `runtime/kql.ts` first; derived files should only be regenerated/adapted.

## Components

- **Lexer**: tokenizes glyph-based KQL input into typed tokens with source locations.
- **Parser**: converts tokens into an AST covering tensors, RLHF payloads, events, vocabularies, and control flow constructs (`IF`, `FOR`, `RETURN`).
- **Executor**: runs AST programs against IndexedDB stores (`tensors`, `rlhf`, `events`, `vocabs`) and keeps runtime values in an environment map.
- **Compressor**: implements `scxq2`, `quantization`, `delta`, and `sparse` transforms for both compression and decompression.

## Quick Start

```ts
import { createTokens, KQLParser, initializeKQL } from "../runtime/kql";

const tokens = createTokens(`
  ⟁STORE⟁ ⟁TENSOR⟁ embeddings
  ⟁SHAPE⟁ [2, 2]
  ⟁DTYPE⟁ float32
  ⟁DATA⟁ [0.1, 0.2, 0.3, 0.4]
  ⟁COMPRESS⟁ scxq2
  ⟁AS⟁ cached_embeddings
`);

const program = new KQLParser(tokens).parse();
const executor = await initializeKQL();
await executor.execute(program);
```

After execution, tensor data is compressed and stored in IndexedDB. Subsequent `LOAD` statements will decompress automatically and hydrate the executor environment.

## Storage Schema

- `tensors`: `{ name, shape, dtype, compression, data, metadata }`
- `rlhf`: arbitrary RLHF records per stored payload
- `events`: time-indexed records (optionally delta-encoded on timestamps)
- `vocabs`: vocabulary buckets keyed by name

All transactions are awaited to keep KQL deterministic and replayable.
