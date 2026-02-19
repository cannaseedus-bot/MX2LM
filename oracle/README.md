# Oracle Compatibility Matrix

## Canonical implementation

The canonical oracle implementation is **Python**, located in `oracle/oracle.py`.
It defines the reference pipeline and score model:

1. boundary extraction (`<GGL>...</GGL>`)
2. tokenizer ABI checks
3. parse
4. legality
5. lowering

The canonical score contributions are:

- boundary: `+0.10`
- tokenize: `+0.15`
- parse: `+0.35`
- legal: `+0.30`
- lower: `+0.10`

## Supported parity ports

The following ports are maintained against the canonical behavior:

- JavaScript: `oracle-js/oracle.js`
- Java: `asx/ggl/Oracle.java`

## Compatibility contract

All ports must preserve:

- stage progression semantics (`boundary` → `tokenize` → `parse` → `legal` → `lower` → `ok`)
- deterministic score accumulation and rounding to 6 decimals
- boundary error codes:
  - `E_GGL_BOUNDARY`
  - `E_GGL_OUTSIDE_TEXT`
- tokenizer ABI error codes:
  - `E_TOKEN_ALLOWED_REGEX`
  - `E_TOKEN_DISALLOWED_CHAR`
  - `E_TOKEN_RESERVED_CODEPOINT`

Shared conformance vectors live at:

- `specs/oracle_conformance_vectors.csv`

Language harnesses that consume those vectors:

- Python: `tests/test_oracle_vectors.py`
- JavaScript: `oracle-js/oracle.vectors.test.mjs`
- Java: `asx/ggl/OracleVectorHarness.java`

## Known deviations

Current known deviation from canonical error-code parity:

- Java currently collapses unimplemented parse/legal/lower failures into generic codes (`E_PARSE`, `E_LEGAL`, `E_LOWER`) in `asx/ggl/Oracle.java`, while Python/JS expose the more specific unimplemented codes (`E_PARSE_UNIMPLEMENTED`, etc.).
- The vector file therefore provides a `java_expected_code` override for affected cases.

When Java adopts specific propagation, `java_expected_code` can be removed and all ports can assert a single universal expected code.
