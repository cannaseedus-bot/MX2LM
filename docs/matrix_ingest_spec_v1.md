# MATRIX Ingest Spec v1 (π-LM / ATOMIC-DOM)

Status: Draft v1

This document defines a binary-first ingest pipeline designed for deterministic π-LM streaming on CPU-bound systems. The format is optimized for fixed-width tokens, aligned atoms, and mmap-friendly access.

## 1. Goals

- **Zero parsing in hot loop**: All text/JSON/HTML parsing happens once, offline.
- **Deterministic streams**: The same input produces identical binary output.
- **Fixed-width atoms**: Predictable alignment for SIMD and cache-friendly access.
- **Composable geometry**: Compatible with future tensor or SVG-based layouts.
- **Interoperable**: Designed to bridge GGUF embeddings and π-LM ingest.

## 2. Canonical Pipeline

```
[ HTML | JSON | MD | TXT ]
        ↓ (one-time)
   CLEAN + NORMALIZE
        ↓
     TOKENIZE (π rules)
        ↓
   PACK → BINARY ATOMS
        ↓
  mmap / seek / stream
        ↓
   π-LM / Embedding / Geometry
```

## 3. π-LM Tokenizer Rules (v1)

### 3.1 Deterministic normalization

1. **UTF-8 decode** with `errors="ignore"`.
2. **Normalize line endings** to `\n`.
3. **Collapse control chars** (ASCII < 0x20) to space, except `\n` and `\t`.
4. **JSON canonicalization** (if JSON input): parse + re-emit with compact separators `,` and `:`.
5. **HTML minimal stripping**: replace `<` and `>` with spaces.
6. **Trim** only leading/trailing whitespace.

### 3.2 Tokenization contract

- Tokenizer maps **each normalized codepoint** to an integer token.
- Token space is fixed-width: `uint16` (0–65535) or `uint32` if vocab exceeds 65k.
- **Reserved tokens**:
  - `0x0000` = padding
  - `0x0001` = document boundary
  - `0x0002` = atom boundary (optional)

### 3.3 Minimum reference mapping (v1)

A deterministic baseline mapping:

```
TOKEN = (ord(codepoint) % VOCAB_SIZE)
```

This is a placeholder mapping to be replaced by the π symbol map. The interface remains the same: `text -> [token]`.

## 4. ATOM Header Format (v1)

Atoms are fixed-length token blocks with a small header for integrity and metadata.

### 4.1 Header layout (64 bytes)

All fields little-endian.

| Offset | Size | Field | Notes |
|--------|------|-------|-------|
| 0x00 | 4 | Magic | `ATOM` (0x4D4F5441) |
| 0x04 | 2 | Version | `0x0001` |
| 0x06 | 2 | Token Dtype | `0x0001`=uint16, `0x0002`=uint32 |
| 0x08 | 4 | Atom Size | Token count per atom (e.g., 256/512) |
| 0x0C | 8 | Atom Index | Global atom index |
| 0x14 | 8 | Stream Offset | Token offset in full stream |
| 0x1C | 4 | Doc ID | Integer document ID |
| 0x20 | 4 | Flags | bitfield (see below) |
| 0x24 | 16 | SHA-256 (truncated) | First 16 bytes of hash |
| 0x34 | 12 | Reserved | zeros for v1 |

### 4.2 Flags

- `0x00000001` = document start
- `0x00000002` = document end
- `0x00000004` = contains padding
- `0x00000008` = contains special tokens

## 5. Binary Atom Layout (v1)

```
[ATOM_HEADER | TOKEN_0 ... TOKEN_(N-1)]
```

- Total size = `64 + (ATOM_SIZE * dtype_bytes)`.
- Alignment: **32 bytes** minimum (AVX2-friendly).
- Atoms are laid out sequentially with no gaps.

## 6. SVG-Tensor Packing (v1)

SVG-Tensor packing describes a geometry-aware token layout for future GPU/WebGPU use.

### 6.1 Geometry metadata

Each atom may optionally include a **sidecar geometry block** stored in a separate file with the same basename and `.svgx` extension.

```
matrix_atoms.bin
matrix_atoms.svgx
```

### 6.2 SVGX layout (binary)

```
[SVGX_HEADER | GEOMETRY_RECORDS...]
```

**SVGX_HEADER (32 bytes)**:

| Offset | Size | Field | Notes |
|--------|------|-------|-------|
| 0x00 | 4 | Magic | `SVGX` (0x58564753) |
| 0x04 | 2 | Version | `0x0001` |
| 0x06 | 2 | Record Size | bytes per record |
| 0x08 | 4 | Atom Size | tokens per atom |
| 0x0C | 4 | Record Count | number of records |
| 0x10 | 16 | Reserved | zeros for v1 |

**GEOMETRY_RECORD (v1)**: 16 bytes per token

| Offset | Size | Field |
|--------|------|-------|
| 0x00 | 4 | Token Index |
| 0x04 | 4 | X (float32) |
| 0x08 | 4 | Y (float32) |
| 0x0C | 4 | Z or Layer (float32) |

This allows a deterministic geometric embedding without affecting atom streaming.

## 7. GGUF Ingest Unification (v1)

### 7.1 Embedding ingestion path

- GGUF embeddings are loaded from their binary blocks.
- Token indices are re-mapped into MATRIX token space.
- Embeddings are stored in a **sidecar binary** with a matching index table.

```
matrix_atoms.bin
matrix_atoms.ggufx
```

### 7.2 GGUFX layout (binary)

```
[GGUFX_HEADER | INDEX_TABLE | EMBEDDING_BLOCKS]
```

**GGUFX_HEADER (32 bytes)**:

| Offset | Size | Field | Notes |
|--------|------|-------|-------|
| 0x00 | 4 | Magic | `GGUX` (0x58554747) |
| 0x04 | 2 | Version | `0x0001` |
| 0x06 | 2 | Embedding Dtype | `0x0001`=f16, `0x0002`=f32 |
| 0x08 | 4 | Embedding Dim | e.g., 256/768 |
| 0x0C | 4 | Token Count | total tokens |
| 0x10 | 16 | Reserved | zeros for v1 |

**INDEX_TABLE**: `Token Count` entries, each 8 bytes

| Offset | Size | Field |
|--------|------|-------|
| 0x00 | 4 | Token ID |
| 0x04 | 4 | Offset (bytes) |

**EMBEDDING_BLOCKS**: contiguous blocks of `Embedding Dim * dtype_bytes`.

## 8. Reference Python Packer Contract (v1)

### 8.1 Input

- Directory of `.txt`, `.md`, `.html`, `.json` files.

### 8.2 Output

- `matrix_atoms.bin` (required)
- `matrix_atoms.svgx` (optional)
- `matrix_atoms.ggufx` (optional)

### 8.3 Required properties

- Deterministic tokenization
- Padding to atom boundary
- Stable ordering (lexicographic file traversal)

## 9. Compatibility

- **Mmap-friendly**: `numpy.memmap` or raw `mmap` with byte slicing.
- **Streaming**: Atoms read sequentially with optional seeks.
- **Future proof**: Headers are versioned and reserve space for growth.

## 10. Glossary

- **ATOM**: fixed-length token block with header metadata.
- **MATRIX**: binary substrate for deterministic ingest.
- **ATOMIC-DOM**: fixed-geometry token domain with aligned atoms.
- **π-LM**: deterministic streaming language machine.
- **SVGX**: geometry sidecar format for token layout.
- **GGUFX**: embedding sidecar format for GGUF ingest.
