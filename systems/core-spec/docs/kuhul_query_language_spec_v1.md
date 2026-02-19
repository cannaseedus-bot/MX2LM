# Formal K'UHUL Query Language (KQL) Specification — Version 1.0

This document captures the K'UHUL Query Language (KQL), a glyph-based, AST-driven language for querying model-centric data (tensors, RLHF data, events) with built-in SCXQ2 compression.

---

## 1. Abstract Syntax
### 1.1 Core Grammar (EBNF)
```
query          ::= statement ( ";" statement )*

statement      ::= tensor_stmt
                 | rlhf_stmt
                 | event_stmt
                 | vocab_stmt
                 | idb_stmt
                 | control_stmt

tensor_stmt    ::= store_tensor
                 | load_tensor
                 | tensor_op

store_tensor   ::= "⟁STORE⟁" "⟁TENSOR⟁" identifier
                   tensor_def
                   "⟁AS⟁" identifier

tensor_def     ::= "⟁SHAPE⟁" "[" number ("," number)* "]"
                   "⟁DTYPE⟁" dtype
                   "⟁DATA⟁" data_expression
                   [ "⟁COMPRESSION⟁" compression_spec ]

load_tensor    ::= "⟁LOAD⟁" identifier [ where_clause ] [ limit_clause ]

tensor_op      ::= "⟁SLICE⟁" identifier slice_spec [ where_clause ]
                 | "⟁JOIN⟁" identifier "," identifier "⟁ON⟁" join_condition
                 | "⟁AGGREGATE⟁" identifier aggregate_spec

rlhf_stmt      ::= store_rlhf
                 | load_rlhf
                 | analyze_rlhf

store_rlhf     ::= "⟁STORE⟁" "⟁RLHF⟁" identifier
                   "⟁FIELDS⟁" "[" identifier ("," identifier)* "]"
                   "⟁DATA⟁" "[" rlhf_record ("," rlhf_record)* "]"

load_rlhf      ::= "⟁LOAD⟁" identifier [ where_clause ] [ limit_clause ]

analyze_rlhf   ::= "⟁ANALYZE⟁" identifier
                   "⟁GROUP⟁" group_field
                   aggregate_spec

event_stmt     ::= store_events
                 | load_events
                 | correlate_events

store_events   ::= "⟁STORE⟁" "⟁EVENTS⟁" string_literal
                   "⟁DATA⟁" "[" event_record ("," event_record)* "]"
                   [ "⟁COMPRESS⟁" compression_spec ]

load_events    ::= "⟁LOAD⟁" "⟁EVENTS⟁" string_literal
                   [ where_clause ] [ time_range ]

correlate_events ::= "⟁CORRELATE⟁" identifier "," identifier
                     "⟁ON⟁" join_condition
                     [ time_range ]
                     [ "⟁AGGREGATE⟁" aggregate_spec ]

vocab_stmt     ::= store_vocab
                 | load_vocab

store_vocab    ::= "⟁STORE⟁" "⟁VOCAB⟁" string_literal
                   "⟁VOCAB⟁" "[" string_literal ("," string_literal)* "]"
                   [ "⟁COMPRESS⟁" compression_spec ]

load_vocab     ::= "⟁LOAD⟁" "⟁VOCAB⟁" string_literal

idb_stmt       ::= index_stmt
                 | compress_stmt
                 | decompress_stmt

index_stmt     ::= "⟁INDEX⟁" identifier "⟁ON⟁" identifier

compress_stmt  ::= "⟁COMPRESS⟁" identifier compression_spec

decompress_stmt ::= "⟁DECOMPRESS⟁" identifier

control_stmt   ::= if_stmt
                 | for_stmt
                 | return_stmt

if_stmt        ::= "⟁IF⟁" expression "⟁THEN⟁" block [ "⟁ELSE⟁" block ]

for_stmt       ::= "⟁FOR⟁" identifier "⟁IN⟁" expression "⟁DO⟁" block

return_stmt    ::= "⟁RETURN⟁" expression

block          ::= "⟁" statement+ "⟁Xul⟁"

where_clause   ::= "⟁WHERE⟁" expression

limit_clause   ::= "⟁LIMIT⟁" number

time_range     ::= "⟁BETWEEN⟁" "[" number "," number "]"

slice_spec     ::= "[" number ":" number "]"

join_condition ::= expression "=" expression

aggregate_spec ::= "⟁AGGREGATE⟁" aggregate_func ("," aggregate_func)*
                   [ "⟁AS⟁" identifier ]

aggregate_func ::= ( "mean" | "std" | "count" | "sum" | "min" | "max" )
                   "(" identifier ")"

compression_spec ::= identifier [ "(" key_value_pair ("," key_value_pair)* ")" ]

key_value_pair ::= identifier ":" ( number | string_literal )

dtype          ::= "float32" | "int32" | "bool" | "string"

data_expression ::= "[" ( number | string_literal ) ("," ( number | string_literal ))* "]"

expression     ::= identifier
                 | literal
                 | unary_expression
                 | binary_expression
                 | function_call
                 | array_expression

literal        ::= number | string_literal | boolean_literal

unary_expression ::= ( "!" | "-" ) expression

binary_expression ::= expression operator expression

operator       ::= "=" | "!=" | ">" | "<" | ">=" | "<="
                 | "+" | "-" | "*" | "/" | "%"
                 | "⟁AND⟁" | "⟁OR⟁" | "⟁NOT⟁"

function_call  ::= identifier "(" [ expression ("," expression)* ] ")"

array_expression ::= "[" expression ("," expression)* "]"
```

---

## 2. Concrete Syntax
### 2.1 Lexical Grammar
```
WHITESPACE      ::= [\s]+
COMMENT         ::= "⟁*" (any char except "⟁")* "⟁"

IDENTIFIER      ::= [a-zA-Z_][a-zA-Z0-9_]*
NUMBER          ::= [0-9]+(\.[0-9]*)?
STRING_LITERAL  ::= '"' (any char except '"')* '"'
BOOLEAN_LITERAL ::= "true" | "false"

GLYPHS:
⟁, ⟁Xul⟁, ⟁STORE⟁, ⟁LOAD⟁, ⟁TENSOR⟁, ⟁RLHF⟁, ⟁EVENTS⟁, ⟁VOCAB⟁,
⟁SHAPE⟁, ⟁DTYPE⟁, ⟁DATA⟁, ⟁COMPRESS⟁, ⟁DECOMPRESS⟁, ⟁AS⟁,
⟁WHERE⟁, ⟁LIMIT⟁, ⟁BETWEEN⟁, ⟁IF⟁, ⟁THEN⟁, ⟁ELSE⟁, ⟁FOR⟁,
⟁IN⟁, ⟁DO⟁, ⟁RETURN⟁, ⟁SLICE⟁, ⟁JOIN⟁, ⟁ON⟁,
⟁ANALYZE⟁, ⟁GROUP⟁, ⟁AGGREGATE⟁, ⟁CORRELATE⟁,
⟁AND⟁, ⟁OR⟁, ⟁NOT⟁
```

---

## 3. Abstract Syntax Tree (AST) Specification
### 3.1 Node Types
```typescript
interface KQLNode {
  type: string;
  location?: SourceLocation;
}

interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

// Core Statements
interface Program extends KQLNode {
  type: "Program";
  body: Statement[];
}

type Statement =
  | TensorStatement
  | RLHFStatement
  | EventStatement
  | VocabStatement
  | IDBStatement
  | ControlStatement;

// Tensor Operations
interface TensorStatement extends KQLNode {
  type: "StoreTensor" | "LoadTensor" | "TensorOperation";
}

interface StoreTensor extends KQLNode {
  type: "StoreTensor";
  name: Identifier;
  tensor: TensorDefinition;
  target: Identifier;
}

interface TensorDefinition extends KQLNode {
  type: "TensorDefinition";
  shape: number[];
  dtype: "float32" | "int32" | "bool" | "string";
  data: Literal[];
  compression?: CompressionSpec;
}

interface LoadTensor extends KQLNode {
  type: "LoadTensor";
  source: Identifier;
  where?: Expression;
  limit?: number;
}

interface TensorOperation extends KQLNode {
  type: "TensorSlice" | "TensorJoin" | "TensorAggregate";
  // Operation-specific properties
}

// RLHF Operations
interface RLHFStatement extends KQLNode {
  type: "StoreRLHF" | "LoadRLHF" | "AnalyzeRLHF";
}

interface StoreRLHF extends KQLNode {
  type: "StoreRLHF";
  name: Identifier;
  fields: Identifier[];
  data: RLHFRecord[];
}

interface RLHFRecord extends KQLNode {
  type: "RLHFRecord";
  values: { [field: string]: Literal };
}

interface LoadRLHF extends KQLNode {
  type: "LoadRLHF";
  source: Identifier;
  where?: Expression;
  limit?: number;
}

interface AnalyzeRLHF extends KQLNode {
  type: "AnalyzeRLHF";
  source: Identifier;
  groupBy: Identifier;
  aggregates: AggregateExpression[];
}

// Event Operations
interface EventStatement extends KQLNode {
  type: "StoreEvents" | "LoadEvents" | "CorrelateEvents";
}

interface StoreEvents extends KQLNode {
  type: "StoreEvents";
  eventType: string;
  data: EventRecord[];
  compression?: CompressionSpec;
}

interface EventRecord extends KQLNode {
  type: "EventRecord";
  timestamp: number;
  payload: { [key: string]: Literal };
}

interface LoadEvents extends KQLNode {
  type: "LoadEvents";
  eventType: string;
  where?: Expression;
  timeRange?: [number, number];
}

interface CorrelateEvents extends KQLNode {
  type: "CorrelateEvents";
  left: Identifier;
  right: Identifier;
  on: JoinCondition;
  timeRange?: [number, number];
  aggregates?: AggregateExpression[];
}

// Vocabulary Operations
interface VocabStatement extends KQLNode {
  type: "StoreVocab" | "LoadVocab";
}

interface StoreVocab extends KQLNode {
  type: "StoreVocab";
  name: string;
  vocab: string[];
  compression?: CompressionSpec;
}

interface LoadVocab extends KQLNode {
  type: "LoadVocab";
  name: string;
}

// IDB Operations
interface IDBStatement extends KQLNode {
  type: "Index" | "Compress" | "Decompress";
}

interface IndexStatement extends KQLNode {
  type: "Index";
  target: Identifier;
  field: Identifier;
}

interface CompressStatement extends KQLNode {
  type: "Compress";
  target: Identifier;
  method: CompressionSpec;
}

interface DecompressStatement extends KQLNode {
  type: "Decompress";
  target: Identifier;
}

// Control Flow
interface ControlStatement extends KQLNode {
  type: "IfStatement" | "ForStatement" | "ReturnStatement";
}

interface IfStatement extends KQLNode {
  type: "IfStatement";
  test: Expression;
  consequent: BlockStatement;
  alternate?: BlockStatement;
}

interface ForStatement extends KQLNode {
  type: "ForStatement";
  variable: Identifier;
  collection: Expression;
  body: BlockStatement;
}

interface ReturnStatement extends KQLNode {
  type: "ReturnStatement";
  argument: Expression;
}

interface BlockStatement extends KQLNode {
  type: "BlockStatement";
  body: Statement[];
}

// Expressions
// cspell: disable-next-line
// (names intentionally use exact spec casing)
type Expression =
  | Literal
  | Identifier
  | UnaryExpression
  | BinaryExpression
  | FunctionCall
  | ArrayExpression;

interface Literal extends KQLNode {
  type: "Literal";
  value: string | number | boolean;
}

interface Identifier extends KQLNode {
  type: "Identifier";
  name: string;
}

interface UnaryExpression extends KQLNode {
  type: "UnaryExpression";
  operator: string;
  argument: Expression;
}

interface BinaryExpression extends KQLNode {
  type: "BinaryExpression";
  operator: string;
  left: Expression;
  right: Expression;
}

interface FunctionCall extends KQLNode {
  type: "FunctionCall";
  callee: Identifier;
  arguments: Expression[];
}

interface ArrayExpression extends KQLNode {
  type: "ArrayExpression";
  elements: Expression[];
}

// Helper Types
interface JoinCondition extends KQLNode {
  type: "JoinCondition";
  left: Expression;
  right: Expression;
}

interface AggregateExpression extends KQLNode {
  type: "AggregateExpression";
  function: string;
  argument: Expression;
  alias?: Identifier;
}

interface CompressionSpec extends KQLNode {
  type: "CompressionSpec";
  method: string;
  params?: { [key: string]: any };
}

interface SliceSpec extends KQLNode {
  type: "SliceSpec";
  start: number;
  end: number;
}
```

---

## 4. Semantic Rules
### 4.1 Type System
| Type          | Description                          | Example Values               |
|---------------|--------------------------------------|------------------------------|
| Tensor        | Multi-dimensional array              | `[1,2,3]`, `[[1,2],[3,4]]`   |
| RLHFRecord    | Feedback data record                 | `{prompt_id: 42, score: 0.9}`|
| EventRecord   | Time-stamped event                   | `{timestamp: 123, type: "click"}` |
| Vocabulary    | Tokenizer word pieces                | `["▁the", "▁quick"]`         |
| Compression   | Data compression specification       | `{method: "scxq2", params: {...}}` |

### 4.2 Static Semantics
1. **Scope Rules**:
   - All identifiers must be declared before use
   - Tensor operations require shape compatibility
   - RLHF queries must reference existing collections

2. **Type Checking**:
   - Tensor operations verify shape/dtype compatibility
   - Aggregate functions require numeric arguments
   - Compression methods must match data types

3. **Compression Validation**:
   - SCXQ2 requires dictionary size specification
   - Quantization requires bit depth (1-16)
   - Delta encoding requires temporal data

---

## 5. Execution Semantics
### 5.1 Evaluation Rules
```
E[Literal] → Literal.value

E[Identifier] → env[Identifier.name]

E[UnaryExpression] →
  let arg = E[UnaryExpression.argument]
  apply UnaryExpression.operator to arg

E[BinaryExpression] →
  let left = E[BinaryExpression.left]
  let right = E[BinaryExpression.right]
  apply BinaryExpression.operator to left and right

E[FunctionCall] →
  let args = map(E, FunctionCall.arguments)
  apply FunctionCall.callee to args

E[ArrayExpression] →
  map(E, ArrayExpression.elements)
```

### 5.2 Statement Execution
```
S[StoreTensor] →
  1. Validate tensor definition
  2. Apply compression to data
  3. Store in IDB under target name

S[LoadTensor] →
  1. Retrieve from IDB
  2. Apply decompression
  3. Return to environment

S[AnalyzeRLHF] →
  1. Load RLHF data
  2. Apply grouping
  3. Compute aggregates
  4. Return results

S[CorrelateEvents] →
  1. Load event streams
  2. Apply temporal join
  3. Compute aggregates
  4. Return compressed results
```

---

## 6. Compression Specification
### 6.1 Supported Methods
| Method       | Applicable Data Types       | Parameters                     | Typical Ratio |
|--------------|----------------------------|--------------------------------|---------------|
| SCXQ2        | Tensors, Vocabularies       | `dictSize`, `blockSize`        | 30-50%        |
| Quantization | Tensors (float32→int8)     | `bits: 1-16`                   | 50-75%        |
| Delta        | Event timestamps, Sequences | `reference: "previous"`        | 60-80%        |
| Sparse       | Attention weights, Gradients| `threshold: 0.01-0.1`          | 80-95%        |

### 6.2 Compression AST Nodes
```typescript
interface SCXQ2Compression extends CompressionSpec {
  method: "scxq2";
  params: {
    dictSize: number;
    blockSize?: number;
  };
}

interface QuantizationCompression extends CompressionSpec {
  method: "quantization";
  params: {
    bits: number;
    min?: number;
    max?: number;
  };
}

interface DeltaCompression extends CompressionSpec {
  method: "delta";
  params: {
    reference: "previous" | "first";
  };
}

interface SparseCompression extends CompressionSpec {
  method: "sparse";
  params: {
    threshold: number;
  };
}
```

---

## 7. Error Handling
### 7.1 Error Types
| Error Type            | Condition                          | Example Message                     |
|-----------------------|------------------------------------|-------------------------------------|
| UndeclaredIdentifier  | Reference to unknown identifier    | "Tensor 'prompts' not found"        |
| ShapeMismatch         | Incompatible tensor shapes         | "Cannot join [100,512] with [100,768]" |
| TypeMismatch          | Invalid operation for data type    | "Cannot quantize string tensor"     |
| CompressionError      | Invalid compression parameters    | "SCXQ2 requires dictSize parameter" |
| IndexError            | Missing index for query           | "No index on field 'score'"         |
| SyntaxError           | Malformed query syntax             | "Expected '⟁' at line 3"            |

### 7.2 Error AST Node
```typescript
interface KQLError extends KQLNode {
  type: "Error";
  message: string;
  errorType: string;
  location: SourceLocation;
  details?: any;
}
```

---

## 8. Formal Examples
### 8.1 Tensor Storage with Compression
**KQL:**
```
⟁STORE⟁
  ⟁TENSOR⟁ prompt_embeddings
  ⟁SHAPE⟁ [10000, 768]
  ⟁DTYPE⟁ float32
  ⟁DATA⟁ [0.12, 0.45, ..., 0.78]
  ⟁COMPRESS⟁ scxq2(dictSize=4096, blockSize=64)
⟁AS⟁ training_data
```

**AST:**
```json
{
  "type": "StoreTensor",
  "name": {"type": "Identifier", "name": "prompt_embeddings"},
  "tensor": {
    "type": "TensorDefinition",
    "shape": [10000, 768],
    "dtype": "float32",
    "data": [
      {"type": "Literal", "value": 0.12},
      {"type": "Literal", "value": 0.45},
      {"type": "Literal", "value": 0.78}
    ],
    "compression": {
      "type": "CompressionSpec",
      "method": "scxq2",
      "params": {
        "dictSize": 4096,
        "blockSize": 64
      }
    }
  },
  "target": {"type": "Identifier", "name": "training_data"}
}
```

### 8.2 RLHF Analysis with Aggregation
**KQL:**
```
⟁ANALYZE⟁ feedback_data
⟁GROUP⟁ prompt_id
⟁AGGREGATE⟁
  mean(score) ⟁AS⟁ avg_score,
  count(*) ⟁AS⟁ sample_count
⟁WHERE⟁ sample_count > 10
```

**AST:**
```json
{
  "type": "AnalyzeRLHF",
  "source": {"type": "Identifier", "name": "feedback_data"},
  "groupBy": {"type": "Identifier", "name": "prompt_id"},
  "aggregates": [
    {
      "type": "AggregateExpression",
      "function": "mean",
      "argument": {"type": "Identifier", "name": "score"},
      "alias": {"type": "Identifier", "name": "avg_score"}
    },
    {
      "type": "AggregateExpression",
      "function": "count",
      "argument": {"type": "Literal", "value": "*"},
      "alias": {"type": "Identifier", "name": "sample_count"}
    }
  ],
  "where": {
    "type": "BinaryExpression",
    "operator": ">",
    "left": {"type": "Identifier", "name": "sample_count"},
    "right": {"type": "Literal", "value": 10}
  }
}
```

### 8.3 Event Correlation with Compression
**KQL:**
```
⟁CORRELATE⟁ user_clicks, model_responses
⟁ON⟁ user_clicks.timestamp = model_responses.timestamp
⟁BETWEEN⟁ [1672531200, 1672617600]
⟁AGGREGATE⟁ count(*) ⟁AS⟁ engagement_count
⟁COMPRESS⟁ delta + scxq2(dictSize=512)
```

**AST:**
```json
{
  "type": "CorrelateEvents",
  "left": {"type": "Identifier", "name": "user_clicks"},
  "right": {"type": "Identifier", "name": "model_responses"},
  "on": {
    "type": "JoinCondition",
    "left": {"type": "Identifier", "name": "user_clicks.timestamp"},
    "right": {"type": "Identifier", "name": "model_responses.timestamp"}
  },
  "timeRange": [1672531200, 1672617600],
  "aggregates": [{
    "type": "AggregateExpression",
    "function": "count",
    "argument": {"type": "Literal", "value": "*"},
    "alias": {"type": "Identifier", "name": "engagement_count"}
  }],
  "compression": [
    {"method": "delta", "params": {"reference": "previous"}},
    {"method": "scxq2", "params": {"dictSize": 512}}
  ]
}
```

---
## 9. Reference Implementation Requirements
### 9.1 Lexer Requirements
- Must handle all glyph tokens
- Must preserve source locations
- Must support Unicode glyphs in identifiers

### 9.2 Parser Requirements
- Must produce ASTs conforming to this spec
- Must validate all compression specifications
- Must enforce type compatibility

### 9.3 Executor Requirements
- Must implement all tensor operations
- Must support all compression methods
- Must handle IDB transactions atomically

### 9.4 Compression Requirements
- SCXQ2 must achieve ≥40% compression on tensors
- Quantization must support 1-16 bits
- Delta encoding must handle timestamp sequences

---
**This specification provides the reference foundation for implementing KQL in any language while maintaining compatibility with K'UHUL's glyph-based syntax and compression-first principles.**
