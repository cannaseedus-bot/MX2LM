/**
 * MX2LM K'UHUL Query Language (KQL) Engine
 *
 * FROZEN ASX-R CORE DIALECT - v1.0
 *
 * KQL is the canonical query language of ASX-R for:
 *   - Tensors
 *   - RLHF data
 *   - Events
 *   - Vocabularies
 *   - IndexedDB / IDB-API
 *   - Compressed result transport
 *
 * Pipeline: Lexer → Parser → AST → Executor
 *
 * @version 1.0.0
 * @law Ω-BLACK-PANEL
 * @status FROZEN
 */

'use strict';

// ============================================================================
// Constants & Glyph Definitions
// ============================================================================

const KQL_VERSION = '1.0.0';

// π-KUHUL constants
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INV = PHI - 1;

// Multi-character glyph tokens (ordered by length for matching)
const MULTI_GLYPHS = [
  { glyph: '⟁Xul⟁', type: 'BLOCK_END' },
  { glyph: '⟁STORE⟁', type: 'STORE' },
  { glyph: '⟁LOAD⟁', type: 'LOAD' },
  { glyph: '⟁TENSOR⟁', type: 'TENSOR' },
  { glyph: '⟁RLHF⟁', type: 'RLHF' },
  { glyph: '⟁EVENTS⟁', type: 'EVENTS' },
  { glyph: '⟁VOCAB⟁', type: 'VOCAB' },
  { glyph: '⟁SHAPE⟁', type: 'SHAPE' },
  { glyph: '⟁DTYPE⟁', type: 'DTYPE' },
  { glyph: '⟁DATA⟁', type: 'DATA' },
  { glyph: '⟁FIELDS⟁', type: 'FIELDS' },
  { glyph: '⟁COMPRESS⟁', type: 'COMPRESS' },
  { glyph: '⟁DECOMPRESS⟁', type: 'DECOMPRESS' },
  { glyph: '⟁COMPRESSION⟁', type: 'COMPRESSION' },
  { glyph: '⟁AS⟁', type: 'AS' },
  { glyph: '⟁WHERE⟁', type: 'WHERE' },
  { glyph: '⟁LIMIT⟁', type: 'LIMIT' },
  { glyph: '⟁BETWEEN⟁', type: 'BETWEEN' },
  { glyph: '⟁IF⟁', type: 'IF' },
  { glyph: '⟁THEN⟁', type: 'THEN' },
  { glyph: '⟁ELSE⟁', type: 'ELSE' },
  { glyph: '⟁FOR⟁', type: 'FOR' },
  { glyph: '⟁IN⟁', type: 'IN' },
  { glyph: '⟁DO⟁', type: 'DO' },
  { glyph: '⟁RETURN⟁', type: 'RETURN' },
  { glyph: '⟁SLICE⟁', type: 'SLICE' },
  { glyph: '⟁JOIN⟁', type: 'JOIN' },
  { glyph: '⟁ON⟁', type: 'ON' },
  { glyph: '⟁ANALYZE⟁', type: 'ANALYZE' },
  { glyph: '⟁GROUP⟁', type: 'GROUP' },
  { glyph: '⟁AGGREGATE⟁', type: 'AGGREGATE' },
  { glyph: '⟁CORRELATE⟁', type: 'CORRELATE' },
  { glyph: '⟁INDEX⟁', type: 'INDEX' },
  { glyph: '⟁AND⟁', type: 'AND' },
  { glyph: '⟁OR⟁', type: 'OR' },
  { glyph: '⟁NOT⟁', type: 'NOT' },
  { glyph: '⟁', type: 'BLOCK_START' }
];

// Single character tokens
const SINGLE_TOKENS = {
  '=': 'EQUALS',
  '+': 'PLUS',
  '-': 'MINUS',
  '*': 'STAR',
  '/': 'SLASH',
  '%': 'PERCENT',
  '>': 'GT',
  '<': 'LT',
  '(': 'LPAREN',
  ')': 'RPAREN',
  '[': 'LBRACKET',
  ']': 'RBRACKET',
  '{': 'LBRACE',
  '}': 'RBRACE',
  ',': 'COMMA',
  ':': 'COLON',
  ';': 'SEMICOLON',
  '.': 'DOT'
};

// Two-character operators
const TWO_CHAR_OPS = ['>=', '<=', '!=', '==', '&&', '||', ':='];

// Data types
const DTYPES = new Set(['float32', 'float16', 'int32', 'int16', 'int8', 'uint8', 'bool', 'string']);

// Aggregate functions
const AGGREGATE_FUNCS = new Set(['mean', 'std', 'count', 'sum', 'min', 'max', 'avg']);

// Compression methods
const COMPRESSION_METHODS = new Set(['scxq2', 'quantization', 'delta', 'sparse', 'none']);

// ============================================================================
// Error Classes
// ============================================================================

class KQLError extends Error {
  constructor(message, errorType, location, details = null) {
    super(message);
    this.name = 'KQLError';
    this.errorType = errorType;
    this.location = location;
    this.details = details;
  }

  toAST() {
    return {
      type: 'Error',
      message: this.message,
      errorType: this.errorType,
      location: this.location,
      details: this.details
    };
  }
}

class KQLSyntaxError extends KQLError {
  constructor(message, location, details = null) {
    super(message, 'SyntaxError', location, details);
    this.name = 'KQLSyntaxError';
  }
}

class KQLTypeError extends KQLError {
  constructor(message, location, details = null) {
    super(message, 'TypeError', location, details);
    this.name = 'KQLTypeError';
  }
}

class KQLReferenceError extends KQLError {
  constructor(message, location, details = null) {
    super(message, 'UndeclaredIdentifier', location, details);
    this.name = 'KQLReferenceError';
  }
}

class KQLCompressionError extends KQLError {
  constructor(message, location, details = null) {
    super(message, 'CompressionError', location, details);
    this.name = 'KQLCompressionError';
  }
}

// ============================================================================
// LEXER
// ============================================================================

class KQLLexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  getLocation() {
    return {
      start: { line: this.line, column: this.column },
      end: { line: this.line, column: this.column }
    };
  }

  peek(offset = 0) {
    return this.input[this.position + offset];
  }

  advance() {
    const char = this.input[this.position];
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  skipWhitespace() {
    while (this.position < this.input.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  skipComment() {
    // Comment format: ⟁* ... ⟁
    if (this.input.substr(this.position, 2) === '⟁*') {
      this.position += 2;
      this.column += 2;
      while (this.position < this.input.length) {
        if (this.peek() === '⟁') {
          this.advance();
          return true;
        }
        this.advance();
      }
      throw new KQLSyntaxError('Unterminated comment', this.getLocation());
    }
    return false;
  }

  matchMultiGlyph() {
    for (const { glyph, type } of MULTI_GLYPHS) {
      if (this.input.substr(this.position, glyph.length) === glyph) {
        const startLoc = this.getLocation();
        for (let i = 0; i < glyph.length; i++) {
          this.advance();
        }
        return {
          type,
          value: glyph,
          location: {
            start: startLoc.start,
            end: { line: this.line, column: this.column }
          }
        };
      }
    }
    return null;
  }

  readNumber() {
    const startLoc = this.getLocation();
    let numStr = '';
    let hasDecimal = false;
    let hasExponent = false;

    // Handle negative sign
    if (this.peek() === '-') {
      numStr += this.advance();
    }

    while (this.position < this.input.length) {
      const char = this.peek();
      if (/\d/.test(char)) {
        numStr += this.advance();
      } else if (char === '.' && !hasDecimal && !hasExponent) {
        hasDecimal = true;
        numStr += this.advance();
      } else if ((char === 'e' || char === 'E') && !hasExponent) {
        hasExponent = true;
        numStr += this.advance();
        if (this.peek() === '+' || this.peek() === '-') {
          numStr += this.advance();
        }
      } else {
        break;
      }
    }

    return {
      type: 'NUMBER',
      value: parseFloat(numStr),
      location: {
        start: startLoc.start,
        end: { line: this.line, column: this.column }
      }
    };
  }

  readString() {
    const startLoc = this.getLocation();
    const quote = this.advance(); // Skip opening quote
    let str = '';

    while (this.position < this.input.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '\\': str += '\\'; break;
          case '"': str += '"'; break;
          case "'": str += "'"; break;
          default: str += escaped;
        }
      } else {
        str += this.advance();
      }
    }

    if (this.position >= this.input.length) {
      throw new KQLSyntaxError('Unterminated string literal', startLoc);
    }

    this.advance(); // Skip closing quote

    return {
      type: 'STRING',
      value: str,
      location: {
        start: startLoc.start,
        end: { line: this.line, column: this.column }
      }
    };
  }

  readIdentifier() {
    const startLoc = this.getLocation();
    let ident = '';

    while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      ident += this.advance();
    }

    // Check for boolean literals
    if (ident === 'true' || ident === 'false') {
      return {
        type: 'BOOLEAN',
        value: ident === 'true',
        location: {
          start: startLoc.start,
          end: { line: this.line, column: this.column }
        }
      };
    }

    return {
      type: 'IDENTIFIER',
      value: ident,
      location: {
        start: startLoc.start,
        end: { line: this.line, column: this.column }
      }
    };
  }

  readOperator() {
    const startLoc = this.getLocation();

    // Check for two-character operators
    const twoChar = this.input.substr(this.position, 2);
    if (TWO_CHAR_OPS.includes(twoChar)) {
      this.advance();
      this.advance();
      return {
        type: 'OPERATOR',
        value: twoChar,
        location: {
          start: startLoc.start,
          end: { line: this.line, column: this.column }
        }
      };
    }

    // Single character operator
    const char = this.advance();
    return {
      type: SINGLE_TOKENS[char] || 'OPERATOR',
      value: char,
      location: {
        start: startLoc.start,
        end: { line: this.line, column: this.column }
      }
    };
  }

  tokenize() {
    this.tokens = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      // Skip comments
      if (this.skipComment()) continue;

      // Check for multi-character glyphs first
      const multiGlyph = this.matchMultiGlyph();
      if (multiGlyph) {
        this.tokens.push(multiGlyph);
        continue;
      }

      const char = this.peek();

      // Numbers
      if (/\d/.test(char) || (char === '-' && /\d/.test(this.peek(1)))) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.tokens.push(this.readString());
        continue;
      }

      // Identifiers
      if (/[a-zA-Z_]/.test(char)) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // Operators and punctuation
      if (char in SINGLE_TOKENS || /[+\-*/%=<>!&|]/.test(char)) {
        this.tokens.push(this.readOperator());
        continue;
      }

      // Unknown character
      throw new KQLSyntaxError(
        `Unexpected character: '${char}'`,
        this.getLocation()
      );
    }

    // Add EOF token
    this.tokens.push({
      type: 'EOF',
      value: null,
      location: this.getLocation()
    });

    return this.tokens;
  }
}

// ============================================================================
// PARSER
// ============================================================================

class KQLParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  current() {
    return this.tokens[this.position];
  }

  peek(offset = 0) {
    return this.tokens[this.position + offset];
  }

  advance() {
    return this.tokens[this.position++];
  }

  expect(type, message = null) {
    const token = this.current();
    if (token.type !== type) {
      throw new KQLSyntaxError(
        message || `Expected ${type}, got ${token.type}`,
        token.location
      );
    }
    return this.advance();
  }

  match(...types) {
    return types.includes(this.current().type);
  }

  consume(...types) {
    if (this.match(...types)) {
      return this.advance();
    }
    return null;
  }

  mergeLocations(start, end) {
    return {
      start: start.start || start,
      end: end.end || end
    };
  }

  // Main parse entry
  parse() {
    const body = [];

    while (!this.match('EOF')) {
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      this.consume('SEMICOLON');
    }

    return {
      type: 'Program',
      body,
      location: body.length > 0
        ? this.mergeLocations(body[0].location, body[body.length - 1].location)
        : null
    };
  }

  parseStatement() {
    const token = this.current();

    switch (token.type) {
      case 'STORE':
        return this.parseStoreStatement();
      case 'LOAD':
        return this.parseLoadStatement();
      case 'SLICE':
        return this.parseSliceStatement();
      case 'JOIN':
        return this.parseJoinStatement();
      case 'ANALYZE':
        return this.parseAnalyzeStatement();
      case 'CORRELATE':
        return this.parseCorrelateStatement();
      case 'INDEX':
        return this.parseIndexStatement();
      case 'COMPRESS':
        return this.parseCompressStatement();
      case 'DECOMPRESS':
        return this.parseDecompressStatement();
      case 'IF':
        return this.parseIfStatement();
      case 'FOR':
        return this.parseForStatement();
      case 'RETURN':
        return this.parseReturnStatement();
      default:
        throw new KQLSyntaxError(
          `Unexpected token: ${token.type}`,
          token.location
        );
    }
  }

  // ⟁STORE⟁ statements
  parseStoreStatement() {
    const storeToken = this.advance(); // STORE
    const next = this.current();

    switch (next.type) {
      case 'TENSOR':
        return this.parseStoreTensor(storeToken);
      case 'RLHF':
        return this.parseStoreRLHF(storeToken);
      case 'EVENTS':
        return this.parseStoreEvents(storeToken);
      case 'VOCAB':
        return this.parseStoreVocab(storeToken);
      default:
        throw new KQLSyntaxError(
          `Expected TENSOR, RLHF, EVENTS, or VOCAB after STORE`,
          next.location
        );
    }
  }

  parseStoreTensor(storeToken) {
    this.advance(); // TENSOR
    const name = this.parseIdentifier();
    const tensor = this.parseTensorDefinition();

    this.expect('AS');
    const target = this.parseIdentifier();

    return {
      type: 'StoreTensor',
      name,
      tensor,
      target,
      location: this.mergeLocations(storeToken.location, target.location)
    };
  }

  parseTensorDefinition() {
    this.expect('SHAPE');
    const shape = this.parseArrayLiteral();

    this.expect('DTYPE');
    const dtypeToken = this.expect('IDENTIFIER');
    if (!DTYPES.has(dtypeToken.value)) {
      throw new KQLTypeError(
        `Invalid dtype: ${dtypeToken.value}`,
        dtypeToken.location
      );
    }
    const dtype = dtypeToken.value;

    this.expect('DATA');
    const data = this.parseArrayLiteral();

    let compression = null;
    if (this.match('COMPRESSION', 'COMPRESS')) {
      this.advance();
      compression = this.parseCompressionSpec();
    }

    return {
      type: 'TensorDefinition',
      shape: shape.elements.map(e => e.value),
      dtype,
      data: data.elements,
      compression,
      location: this.mergeLocations(shape.location, data.location)
    };
  }

  parseStoreRLHF(storeToken) {
    this.advance(); // RLHF
    const name = this.parseIdentifier();

    this.expect('FIELDS');
    const fields = this.parseFieldList();

    this.expect('DATA');
    const data = this.parseRLHFDataArray();

    return {
      type: 'StoreRLHF',
      name,
      fields,
      data,
      location: this.mergeLocations(storeToken.location, data.location)
    };
  }

  parseFieldList() {
    this.expect('LBRACKET');
    const fields = [];

    while (!this.match('RBRACKET')) {
      fields.push(this.parseIdentifier());
      if (!this.match('RBRACKET')) {
        this.expect('COMMA');
      }
    }

    this.expect('RBRACKET');
    return fields;
  }

  parseRLHFDataArray() {
    const startToken = this.expect('LBRACKET');
    const records = [];

    while (!this.match('RBRACKET')) {
      records.push(this.parseRLHFRecord());
      if (!this.match('RBRACKET')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RBRACKET');
    return {
      type: 'RLHFDataArray',
      records,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }

  parseRLHFRecord() {
    const startToken = this.expect('LBRACE');
    const values = {};

    while (!this.match('RBRACE')) {
      const key = this.expect('IDENTIFIER');
      this.expect('COLON');
      const value = this.parseLiteral();
      values[key.value] = value;

      if (!this.match('RBRACE')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RBRACE');
    return {
      type: 'RLHFRecord',
      values,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }

  parseStoreEvents(storeToken) {
    this.advance(); // EVENTS
    const eventType = this.parseStringLiteral();

    this.expect('DATA');
    const data = this.parseEventDataArray();

    let compression = null;
    if (this.match('COMPRESS')) {
      this.advance();
      compression = this.parseCompressionSpec();
    }

    return {
      type: 'StoreEvents',
      eventType: eventType.value,
      data,
      compression,
      location: this.mergeLocations(storeToken.location, data.location)
    };
  }

  parseEventDataArray() {
    const startToken = this.expect('LBRACKET');
    const records = [];

    while (!this.match('RBRACKET')) {
      records.push(this.parseEventRecord());
      if (!this.match('RBRACKET')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RBRACKET');
    return {
      type: 'EventDataArray',
      records,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }

  parseEventRecord() {
    const startToken = this.expect('LBRACE');
    let timestamp = null;
    const payload = {};

    while (!this.match('RBRACE')) {
      const key = this.expect('IDENTIFIER');
      this.expect('COLON');
      const value = this.parseLiteral();

      if (key.value === 'timestamp') {
        timestamp = value.value;
      } else {
        payload[key.value] = value;
      }

      if (!this.match('RBRACE')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RBRACE');
    return {
      type: 'EventRecord',
      timestamp,
      payload,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }

  parseStoreVocab(storeToken) {
    this.advance(); // VOCAB
    const name = this.parseStringLiteral();

    this.expect('VOCAB');
    const vocab = this.parseStringArrayLiteral();

    let compression = null;
    if (this.match('COMPRESS')) {
      this.advance();
      compression = this.parseCompressionSpec();
    }

    return {
      type: 'StoreVocab',
      name: name.value,
      vocab: vocab.elements.map(e => e.value),
      compression,
      location: this.mergeLocations(storeToken.location, vocab.location)
    };
  }

  // ⟁LOAD⟁ statements
  parseLoadStatement() {
    const loadToken = this.advance(); // LOAD
    const next = this.current();

    if (next.type === 'EVENTS') {
      return this.parseLoadEvents(loadToken);
    } else if (next.type === 'VOCAB') {
      return this.parseLoadVocab(loadToken);
    } else if (next.type === 'IDENTIFIER') {
      return this.parseLoadTensor(loadToken);
    } else {
      throw new KQLSyntaxError(
        `Expected identifier, EVENTS, or VOCAB after LOAD`,
        next.location
      );
    }
  }

  parseLoadTensor(loadToken) {
    const source = this.parseIdentifier();

    let where = null;
    if (this.match('WHERE')) {
      this.advance();
      where = this.parseExpression();
    }

    let limit = null;
    if (this.match('LIMIT')) {
      this.advance();
      const limitToken = this.expect('NUMBER');
      limit = limitToken.value;
    }

    return {
      type: 'LoadTensor',
      source,
      where,
      limit,
      location: this.mergeLocations(loadToken.location, source.location)
    };
  }

  parseLoadEvents(loadToken) {
    this.advance(); // EVENTS
    const eventType = this.parseStringLiteral();

    let where = null;
    if (this.match('WHERE')) {
      this.advance();
      where = this.parseExpression();
    }

    let timeRange = null;
    if (this.match('BETWEEN')) {
      this.advance();
      timeRange = this.parseTimeRange();
    }

    return {
      type: 'LoadEvents',
      eventType: eventType.value,
      where,
      timeRange,
      location: this.mergeLocations(loadToken.location, eventType.location)
    };
  }

  parseLoadVocab(loadToken) {
    this.advance(); // VOCAB
    const name = this.parseStringLiteral();

    return {
      type: 'LoadVocab',
      name: name.value,
      location: this.mergeLocations(loadToken.location, name.location)
    };
  }

  parseTimeRange() {
    this.expect('LBRACKET');
    const start = this.expect('NUMBER');
    this.expect('COMMA');
    const end = this.expect('NUMBER');
    this.expect('RBRACKET');

    return [start.value, end.value];
  }

  // ⟁ANALYZE⟁ statement
  parseAnalyzeStatement() {
    const analyzeToken = this.advance(); // ANALYZE
    const source = this.parseIdentifier();

    this.expect('GROUP');
    const groupBy = this.parseIdentifier();

    this.expect('AGGREGATE');
    const aggregates = this.parseAggregateList();

    let where = null;
    if (this.match('WHERE')) {
      this.advance();
      where = this.parseExpression();
    }

    return {
      type: 'AnalyzeRLHF',
      source,
      groupBy,
      aggregates,
      where,
      location: this.mergeLocations(analyzeToken.location, groupBy.location)
    };
  }

  parseAggregateList() {
    const aggregates = [];

    do {
      aggregates.push(this.parseAggregateExpression());
    } while (this.consume('COMMA'));

    return aggregates;
  }

  parseAggregateExpression() {
    const funcToken = this.expect('IDENTIFIER');
    if (!AGGREGATE_FUNCS.has(funcToken.value)) {
      throw new KQLSyntaxError(
        `Unknown aggregate function: ${funcToken.value}`,
        funcToken.location
      );
    }

    this.expect('LPAREN');
    let argument;
    if (this.match('STAR')) {
      argument = { type: 'Literal', value: '*', location: this.advance().location };
    } else {
      argument = this.parseIdentifier();
    }
    this.expect('RPAREN');

    let alias = null;
    if (this.match('AS')) {
      this.advance();
      alias = this.parseIdentifier();
    }

    return {
      type: 'AggregateExpression',
      function: funcToken.value,
      argument,
      alias,
      location: this.mergeLocations(funcToken.location, alias?.location || argument.location)
    };
  }

  // ⟁CORRELATE⟁ statement
  parseCorrelateStatement() {
    const correlateToken = this.advance(); // CORRELATE
    const left = this.parseIdentifier();
    this.expect('COMMA');
    const right = this.parseIdentifier();

    this.expect('ON');
    const on = this.parseJoinCondition();

    let timeRange = null;
    if (this.match('BETWEEN')) {
      this.advance();
      timeRange = this.parseTimeRange();
    }

    let aggregates = null;
    if (this.match('AGGREGATE')) {
      this.advance();
      aggregates = this.parseAggregateList();
    }

    let compression = null;
    if (this.match('COMPRESS')) {
      this.advance();
      compression = this.parseCompressionSpec();
    }

    return {
      type: 'CorrelateEvents',
      left,
      right,
      on,
      timeRange,
      aggregates,
      compression,
      location: this.mergeLocations(correlateToken.location, right.location)
    };
  }

  parseJoinCondition() {
    const left = this.parseExpression();
    this.expect('EQUALS');
    const right = this.parseExpression();

    return {
      type: 'JoinCondition',
      left,
      right,
      location: this.mergeLocations(left.location, right.location)
    };
  }

  // ⟁SLICE⟁ statement
  parseSliceStatement() {
    const sliceToken = this.advance(); // SLICE
    const source = this.parseIdentifier();
    const slice = this.parseSliceSpec();

    let where = null;
    if (this.match('WHERE')) {
      this.advance();
      where = this.parseExpression();
    }

    return {
      type: 'TensorSlice',
      source,
      slice,
      where,
      location: this.mergeLocations(sliceToken.location, source.location)
    };
  }

  parseSliceSpec() {
    this.expect('LBRACKET');
    const start = this.expect('NUMBER');
    this.expect('COLON');
    const end = this.expect('NUMBER');
    this.expect('RBRACKET');

    return {
      type: 'SliceSpec',
      start: start.value,
      end: end.value,
      location: this.mergeLocations(start.location, end.location)
    };
  }

  // ⟁JOIN⟁ statement
  parseJoinStatement() {
    const joinToken = this.advance(); // JOIN
    const left = this.parseIdentifier();
    this.expect('COMMA');
    const right = this.parseIdentifier();

    this.expect('ON');
    const on = this.parseJoinCondition();

    return {
      type: 'TensorJoin',
      left,
      right,
      on,
      location: this.mergeLocations(joinToken.location, right.location)
    };
  }

  // ⟁INDEX⟁ statement
  parseIndexStatement() {
    const indexToken = this.advance(); // INDEX
    const target = this.parseIdentifier();

    this.expect('ON');
    const field = this.parseIdentifier();

    return {
      type: 'IndexStatement',
      target,
      field,
      location: this.mergeLocations(indexToken.location, field.location)
    };
  }

  // ⟁COMPRESS⟁ statement
  parseCompressStatement() {
    const compressToken = this.advance(); // COMPRESS
    const target = this.parseIdentifier();
    const method = this.parseCompressionSpec();

    return {
      type: 'CompressStatement',
      target,
      method,
      location: this.mergeLocations(compressToken.location, target.location)
    };
  }

  parseCompressionSpec() {
    const methodToken = this.expect('IDENTIFIER');
    if (!COMPRESSION_METHODS.has(methodToken.value)) {
      throw new KQLCompressionError(
        `Unknown compression method: ${methodToken.value}`,
        methodToken.location
      );
    }

    let params = {};
    if (this.match('LPAREN')) {
      this.advance();
      params = this.parseKeyValuePairs();
      this.expect('RPAREN');
    }

    // Check for chained compression (e.g., delta + scxq2)
    let next = null;
    if (this.match('PLUS')) {
      this.advance();
      next = this.parseCompressionSpec();
    }

    const spec = {
      type: 'CompressionSpec',
      method: methodToken.value,
      params,
      location: methodToken.location
    };

    if (next) {
      return [spec, ...(Array.isArray(next) ? next : [next])];
    }

    return spec;
  }

  parseKeyValuePairs() {
    const pairs = {};

    while (!this.match('RPAREN')) {
      const key = this.expect('IDENTIFIER');
      this.expect('COLON');
      const value = this.parseLiteral();
      pairs[key.value] = value.value;

      if (!this.match('RPAREN')) {
        this.consume('COMMA');
      }
    }

    return pairs;
  }

  // ⟁DECOMPRESS⟁ statement
  parseDecompressStatement() {
    const decompressToken = this.advance(); // DECOMPRESS
    const target = this.parseIdentifier();

    return {
      type: 'DecompressStatement',
      target,
      location: this.mergeLocations(decompressToken.location, target.location)
    };
  }

  // Control flow
  parseIfStatement() {
    const ifToken = this.advance(); // IF
    const test = this.parseExpression();

    this.expect('THEN');
    const consequent = this.parseBlock();

    let alternate = null;
    if (this.match('ELSE')) {
      this.advance();
      alternate = this.parseBlock();
    }

    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
      location: this.mergeLocations(ifToken.location, consequent.location)
    };
  }

  parseForStatement() {
    const forToken = this.advance(); // FOR
    const variable = this.parseIdentifier();

    this.expect('IN');
    const collection = this.parseExpression();

    this.expect('DO');
    const body = this.parseBlock();

    return {
      type: 'ForStatement',
      variable,
      collection,
      body,
      location: this.mergeLocations(forToken.location, body.location)
    };
  }

  parseReturnStatement() {
    const returnToken = this.advance(); // RETURN
    const argument = this.parseExpression();

    return {
      type: 'ReturnStatement',
      argument,
      location: this.mergeLocations(returnToken.location, argument.location)
    };
  }

  parseBlock() {
    const startToken = this.expect('BLOCK_START');
    const body = [];

    while (!this.match('BLOCK_END') && !this.match('EOF')) {
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      this.consume('SEMICOLON');
    }

    const endToken = this.expect('BLOCK_END');

    return {
      type: 'BlockStatement',
      body,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }

  // Expressions
  parseExpression() {
    return this.parseBinaryExpression();
  }

  parseBinaryExpression(minPrecedence = 0) {
    let left = this.parseUnaryExpression();

    while (true) {
      const op = this.current();
      const precedence = this.getOperatorPrecedence(op);

      if (precedence < minPrecedence) break;

      this.advance();
      const right = this.parseBinaryExpression(precedence + 1);

      left = {
        type: 'BinaryExpression',
        operator: op.value,
        left,
        right,
        location: this.mergeLocations(left.location, right.location)
      };
    }

    return left;
  }

  getOperatorPrecedence(token) {
    const precedences = {
      'OR': 1, '⟁OR⟁': 1, '||': 1,
      'AND': 2, '⟁AND⟁': 2, '&&': 2,
      '==': 3, '!=': 3, '=': 3,
      '<': 4, '>': 4, '<=': 4, '>=': 4,
      '+': 5, '-': 5,
      '*': 6, '/': 6, '%': 6
    };

    return precedences[token.value] || precedences[token.type] || -1;
  }

  parseUnaryExpression() {
    if (this.match('MINUS') || this.match('NOT') || this.current().value === '!') {
      const op = this.advance();
      const argument = this.parseUnaryExpression();
      return {
        type: 'UnaryExpression',
        operator: op.value,
        argument,
        location: this.mergeLocations(op.location, argument.location)
      };
    }

    return this.parsePrimaryExpression();
  }

  parsePrimaryExpression() {
    const token = this.current();

    // Literals
    if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'BOOLEAN') {
      return this.parseLiteral();
    }

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    // Array literal
    if (token.type === 'LBRACKET') {
      return this.parseArrayLiteral();
    }

    // Identifier or function call
    if (token.type === 'IDENTIFIER') {
      const ident = this.parseIdentifier();

      // Check for function call
      if (this.match('LPAREN')) {
        return this.parseFunctionCall(ident);
      }

      // Check for member access
      if (this.match('DOT')) {
        return this.parseMemberExpression(ident);
      }

      return ident;
    }

    throw new KQLSyntaxError(
      `Unexpected token in expression: ${token.type}`,
      token.location
    );
  }

  parseFunctionCall(callee) {
    this.expect('LPAREN');
    const args = [];

    while (!this.match('RPAREN')) {
      args.push(this.parseExpression());
      if (!this.match('RPAREN')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RPAREN');

    return {
      type: 'FunctionCall',
      callee,
      arguments: args,
      location: this.mergeLocations(callee.location, endToken.location)
    };
  }

  parseMemberExpression(object) {
    this.expect('DOT');
    const property = this.parseIdentifier();

    let expr = {
      type: 'MemberExpression',
      object,
      property,
      location: this.mergeLocations(object.location, property.location)
    };

    // Chain member access
    while (this.match('DOT')) {
      this.advance();
      const nextProp = this.parseIdentifier();
      expr = {
        type: 'MemberExpression',
        object: expr,
        property: nextProp,
        location: this.mergeLocations(expr.location, nextProp.location)
      };
    }

    return expr;
  }

  parseIdentifier() {
    const token = this.expect('IDENTIFIER');
    return {
      type: 'Identifier',
      name: token.value,
      location: token.location
    };
  }

  parseLiteral() {
    const token = this.current();
    if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'BOOLEAN') {
      this.advance();
      return {
        type: 'Literal',
        value: token.value,
        location: token.location
      };
    }
    throw new KQLSyntaxError(`Expected literal, got ${token.type}`, token.location);
  }

  parseStringLiteral() {
    const token = this.expect('STRING');
    return {
      type: 'Literal',
      value: token.value,
      location: token.location
    };
  }

  parseArrayLiteral() {
    const startToken = this.expect('LBRACKET');
    const elements = [];

    while (!this.match('RBRACKET')) {
      elements.push(this.parseExpression());
      if (!this.match('RBRACKET')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RBRACKET');

    return {
      type: 'ArrayExpression',
      elements,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }

  parseStringArrayLiteral() {
    const startToken = this.expect('LBRACKET');
    const elements = [];

    while (!this.match('RBRACKET')) {
      elements.push(this.parseStringLiteral());
      if (!this.match('RBRACKET')) {
        this.expect('COMMA');
      }
    }

    const endToken = this.expect('RBRACKET');

    return {
      type: 'ArrayExpression',
      elements,
      location: this.mergeLocations(startToken.location, endToken.location)
    };
  }
}

// ============================================================================
// EXECUTOR
// ============================================================================

class KQLExecutor {
  constructor(db = null) {
    this.db = db;
    this.env = {};
    this.results = [];
  }

  async execute(ast) {
    if (ast.type !== 'Program') {
      throw new KQLError('Expected Program node', 'ExecutionError', ast.location);
    }

    for (const statement of ast.body) {
      const result = await this.executeStatement(statement);
      if (result !== undefined) {
        this.results.push(result);
      }
    }

    return {
      success: true,
      environment: this.env,
      results: this.results
    };
  }

  async executeStatement(stmt) {
    switch (stmt.type) {
      case 'StoreTensor':
        return this.executeStoreTensor(stmt);
      case 'LoadTensor':
        return this.executeLoadTensor(stmt);
      case 'StoreRLHF':
        return this.executeStoreRLHF(stmt);
      case 'LoadRLHF':
        return this.executeLoadRLHF(stmt);
      case 'StoreEvents':
        return this.executeStoreEvents(stmt);
      case 'LoadEvents':
        return this.executeLoadEvents(stmt);
      case 'StoreVocab':
        return this.executeStoreVocab(stmt);
      case 'LoadVocab':
        return this.executeLoadVocab(stmt);
      case 'AnalyzeRLHF':
        return this.executeAnalyzeRLHF(stmt);
      case 'CorrelateEvents':
        return this.executeCorrelateEvents(stmt);
      case 'TensorSlice':
        return this.executeTensorSlice(stmt);
      case 'TensorJoin':
        return this.executeTensorJoin(stmt);
      case 'IndexStatement':
        return this.executeIndexStatement(stmt);
      case 'CompressStatement':
        return this.executeCompressStatement(stmt);
      case 'DecompressStatement':
        return this.executeDecompressStatement(stmt);
      case 'IfStatement':
        return this.executeIfStatement(stmt);
      case 'ForStatement':
        return this.executeForStatement(stmt);
      case 'ReturnStatement':
        return this.executeReturnStatement(stmt);
      default:
        throw new KQLError(`Unknown statement type: ${stmt.type}`, 'ExecutionError', stmt.location);
    }
  }

  // Tensor operations
  async executeStoreTensor(stmt) {
    const data = stmt.tensor.data.map(d => d.value);

    // Apply compression if specified
    let compressedData = data;
    let compressionMeta = null;

    if (stmt.tensor.compression) {
      const compressionResult = this.applyCompression(data, stmt.tensor.compression);
      compressedData = compressionResult.data;
      compressionMeta = compressionResult.meta;
    }

    const tensorRecord = {
      name: stmt.target.name,
      originalName: stmt.name.name,
      shape: stmt.tensor.shape,
      dtype: stmt.tensor.dtype,
      data: compressedData,
      compression: compressionMeta,
      metadata: {
        created_at: Date.now(),
        phi_signature: this.computePhiSignature(data)
      }
    };

    if (this.db) {
      await this.dbStore('tensors', tensorRecord);
    }

    this.env[stmt.target.name] = tensorRecord;
    return tensorRecord;
  }

  async executeLoadTensor(stmt) {
    let tensor;

    if (this.db) {
      tensor = await this.dbGet('tensors', stmt.source.name);
    } else {
      tensor = this.env[stmt.source.name];
    }

    if (!tensor) {
      throw new KQLReferenceError(
        `Tensor '${stmt.source.name}' not found`,
        stmt.location
      );
    }

    // Decompress if needed
    if (tensor.compression) {
      tensor.data = this.applyDecompression(tensor.data, tensor.compression);
    }

    // Apply WHERE filter if specified
    if (stmt.where) {
      tensor = this.filterTensor(tensor, stmt.where);
    }

    // Apply LIMIT if specified
    if (stmt.limit !== null) {
      tensor.data = tensor.data.slice(0, stmt.limit);
    }

    this.env[stmt.source.name] = tensor;
    return tensor;
  }

  // RLHF operations
  async executeStoreRLHF(stmt) {
    const records = stmt.data.records.map(record => {
      const obj = { id: this.generateId() };
      for (const field of stmt.fields) {
        obj[field.name] = record.values[field.name]?.value;
      }
      obj.timestamp = Date.now();
      return obj;
    });

    if (this.db) {
      for (const record of records) {
        await this.dbStore('rlhf', record);
      }
    }

    this.env[stmt.name.name] = records;
    return records;
  }

  async executeLoadRLHF(stmt) {
    let records;

    if (this.db) {
      records = await this.dbGetAll('rlhf');
    } else {
      records = this.env[stmt.source?.name] || [];
    }

    // Apply WHERE filter
    if (stmt.where) {
      records = this.filterRecords(records, stmt.where);
    }

    // Apply LIMIT
    if (stmt.limit !== null) {
      records = records.slice(0, stmt.limit);
    }

    return records;
  }

  async executeAnalyzeRLHF(stmt) {
    let records = await this.executeLoadRLHF({ source: stmt.source });

    // Group by field
    const groups = {};
    for (const record of records) {
      const key = record[stmt.groupBy.name];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    }

    // Compute aggregates for each group
    const results = [];
    for (const [key, groupRecords] of Object.entries(groups)) {
      const result = { [stmt.groupBy.name]: key };

      for (const agg of stmt.aggregates) {
        const values = groupRecords.map(r => {
          if (agg.argument.value === '*') return 1;
          return r[agg.argument.name];
        }).filter(v => v !== undefined);

        result[agg.alias?.name || agg.function] = this.computeAggregate(agg.function, values);
      }

      results.push(result);
    }

    // Apply WHERE filter on aggregated results
    if (stmt.where) {
      return this.filterRecords(results, stmt.where);
    }

    return results;
  }

  // Event operations
  async executeStoreEvents(stmt) {
    const records = stmt.data.records.map(record => ({
      id: this.generateId(),
      type: stmt.eventType,
      timestamp: record.timestamp,
      payload: record.payload,
      compression: stmt.compression
    }));

    // Apply delta encoding if specified
    if (stmt.compression?.method === 'delta' ||
        (Array.isArray(stmt.compression) && stmt.compression.some(c => c.method === 'delta'))) {
      this.applyDeltaEncodingToEvents(records);
    }

    if (this.db) {
      for (const record of records) {
        await this.dbStore('events', record);
      }
    }

    return records;
  }

  async executeLoadEvents(stmt) {
    let events;

    if (this.db) {
      events = await this.dbQuery('events', { type: stmt.eventType });
    } else {
      events = Object.values(this.env).filter(e => e?.type === stmt.eventType);
    }

    // Apply time range filter
    if (stmt.timeRange) {
      const [start, end] = stmt.timeRange;
      events = events.filter(e => e.timestamp >= start && e.timestamp <= end);
    }

    // Apply WHERE filter
    if (stmt.where) {
      events = this.filterRecords(events, stmt.where);
    }

    return events;
  }

  async executeCorrelateEvents(stmt) {
    const leftEvents = await this.executeLoadEvents({
      eventType: stmt.left.name,
      timeRange: stmt.timeRange
    });
    const rightEvents = await this.executeLoadEvents({
      eventType: stmt.right.name,
      timeRange: stmt.timeRange
    });

    // Perform correlation join
    const correlated = [];
    for (const left of leftEvents) {
      for (const right of rightEvents) {
        if (this.evaluateJoinCondition(stmt.on, left, right)) {
          correlated.push({ left, right, timeDiff: Math.abs(left.timestamp - right.timestamp) });
        }
      }
    }

    // Apply aggregates if specified
    if (stmt.aggregates) {
      const aggregated = {};
      for (const agg of stmt.aggregates) {
        const values = correlated.map(c => {
          if (agg.argument.value === '*') return 1;
          return c[agg.argument.name];
        });
        aggregated[agg.alias?.name || agg.function] = this.computeAggregate(agg.function, values);
      }
      return aggregated;
    }

    return correlated;
  }

  // Vocab operations
  async executeStoreVocab(stmt) {
    const vocabRecord = {
      name: stmt.name,
      vocab: stmt.vocab,
      size: stmt.vocab.length,
      compression: stmt.compression,
      created_at: Date.now()
    };

    if (stmt.compression) {
      vocabRecord.compressedVocab = this.applyCompression(stmt.vocab, stmt.compression).data;
    }

    if (this.db) {
      await this.dbStore('vocabs', vocabRecord);
    }

    this.env[stmt.name] = vocabRecord;
    return vocabRecord;
  }

  async executeLoadVocab(stmt) {
    let vocab;

    if (this.db) {
      vocab = await this.dbGet('vocabs', stmt.name);
    } else {
      vocab = this.env[stmt.name];
    }

    if (!vocab) {
      throw new KQLReferenceError(`Vocabulary '${stmt.name}' not found`, stmt.location);
    }

    return vocab;
  }

  // Tensor operations
  async executeTensorSlice(stmt) {
    const tensor = this.env[stmt.source.name];
    if (!tensor) {
      throw new KQLReferenceError(`Tensor '${stmt.source.name}' not found`, stmt.location);
    }

    const slicedData = tensor.data.slice(stmt.slice.start, stmt.slice.end);
    return {
      ...tensor,
      data: slicedData,
      shape: [slicedData.length, ...tensor.shape.slice(1)]
    };
  }

  async executeTensorJoin(stmt) {
    const left = this.env[stmt.left.name];
    const right = this.env[stmt.right.name];

    if (!left) {
      throw new KQLReferenceError(`Tensor '${stmt.left.name}' not found`, stmt.location);
    }
    if (!right) {
      throw new KQLReferenceError(`Tensor '${stmt.right.name}' not found`, stmt.location);
    }

    // Simple concatenation join
    return {
      shape: [left.shape[0], left.shape[1] + right.shape[1]],
      dtype: left.dtype,
      data: left.data.concat(right.data)
    };
  }

  // Index operations
  async executeIndexStatement(stmt) {
    // Index creation is typically handled at DB initialization
    // This is a placeholder for runtime index hints
    return {
      type: 'IndexCreated',
      target: stmt.target.name,
      field: stmt.field.name
    };
  }

  // Compression operations
  async executeCompressStatement(stmt) {
    const target = this.env[stmt.target.name];
    if (!target) {
      throw new KQLReferenceError(`Target '${stmt.target.name}' not found`, stmt.location);
    }

    const result = this.applyCompression(target.data, stmt.method);
    target.data = result.data;
    target.compression = result.meta;

    return target;
  }

  async executeDecompressStatement(stmt) {
    const target = this.env[stmt.target.name];
    if (!target) {
      throw new KQLReferenceError(`Target '${stmt.target.name}' not found`, stmt.location);
    }

    if (target.compression) {
      target.data = this.applyDecompression(target.data, target.compression);
      target.compression = null;
    }

    return target;
  }

  // Control flow
  async executeIfStatement(stmt) {
    const testResult = this.evaluateExpression(stmt.test);

    if (testResult) {
      return this.executeBlock(stmt.consequent);
    } else if (stmt.alternate) {
      return this.executeBlock(stmt.alternate);
    }
  }

  async executeForStatement(stmt) {
    const collection = this.evaluateExpression(stmt.collection);
    const results = [];

    for (const item of collection) {
      this.env[stmt.variable.name] = item;
      const result = await this.executeBlock(stmt.body);
      if (result !== undefined) {
        results.push(result);
      }
    }

    return results;
  }

  executeReturnStatement(stmt) {
    return this.evaluateExpression(stmt.argument);
  }

  async executeBlock(block) {
    let lastResult;
    for (const stmt of block.body) {
      lastResult = await this.executeStatement(stmt);
    }
    return lastResult;
  }

  // Expression evaluation
  evaluateExpression(expr) {
    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier':
        if (!(expr.name in this.env)) {
          throw new KQLReferenceError(`Undefined identifier: ${expr.name}`, expr.location);
        }
        return this.env[expr.name];

      case 'BinaryExpression':
        return this.evaluateBinaryExpression(expr);

      case 'UnaryExpression':
        return this.evaluateUnaryExpression(expr);

      case 'FunctionCall':
        return this.evaluateFunctionCall(expr);

      case 'ArrayExpression':
        return expr.elements.map(e => this.evaluateExpression(e));

      case 'MemberExpression':
        return this.evaluateMemberExpression(expr);

      default:
        throw new KQLError(`Unknown expression type: ${expr.type}`, 'EvaluationError', expr.location);
    }
  }

  evaluateBinaryExpression(expr) {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    switch (expr.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '==': case '=': return left == right;
      case '!=': return left != right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '&&': case '⟁AND⟁': return left && right;
      case '||': case '⟁OR⟁': return left || right;
      default:
        throw new KQLError(`Unknown operator: ${expr.operator}`, 'EvaluationError', expr.location);
    }
  }

  evaluateUnaryExpression(expr) {
    const arg = this.evaluateExpression(expr.argument);

    switch (expr.operator) {
      case '-': return -arg;
      case '!': case '⟁NOT⟁': return !arg;
      default:
        throw new KQLError(`Unknown unary operator: ${expr.operator}`, 'EvaluationError', expr.location);
    }
  }

  evaluateFunctionCall(expr) {
    const args = expr.arguments.map(a => this.evaluateExpression(a));

    // Built-in functions
    const builtins = {
      'length': (arr) => arr.length,
      'sum': (arr) => arr.reduce((a, b) => a + b, 0),
      'mean': (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
      'min': (arr) => Math.min(...arr),
      'max': (arr) => Math.max(...arr),
      'abs': (n) => Math.abs(n),
      'sqrt': (n) => Math.sqrt(n),
      'phi': () => PHI,
      'golden': (n) => n * PHI,
      'entropy': (arr) => this.computeEntropy(arr)
    };

    const funcName = expr.callee.name.toLowerCase();
    if (funcName in builtins) {
      return builtins[funcName](...args);
    }

    throw new KQLError(`Unknown function: ${expr.callee.name}`, 'EvaluationError', expr.location);
  }

  evaluateMemberExpression(expr) {
    const object = this.evaluateExpression(expr.object);
    const property = expr.property.name;

    if (object === null || object === undefined) {
      throw new KQLReferenceError(`Cannot access property '${property}' of null`, expr.location);
    }

    return object[property];
  }

  evaluateJoinCondition(condition, left, right) {
    // Simple equality check based on the condition
    const leftVal = this.resolveMemberPath(condition.left, { left, right });
    const rightVal = this.resolveMemberPath(condition.right, { left, right });
    return Math.abs(leftVal - rightVal) <= 1000; // 1 second window for timestamps
  }

  resolveMemberPath(expr, context) {
    if (expr.type === 'Identifier') {
      return context[expr.name];
    }
    if (expr.type === 'MemberExpression') {
      const obj = this.resolveMemberPath(expr.object, context);
      return obj?.[expr.property.name];
    }
    return this.evaluateExpression(expr);
  }

  // Filtering
  filterTensor(tensor, whereExpr) {
    // For tensors, we filter based on metadata or indices
    return tensor;
  }

  filterRecords(records, whereExpr) {
    return records.filter(record => {
      const oldEnv = { ...this.env };
      Object.assign(this.env, record);
      const result = this.evaluateExpression(whereExpr);
      this.env = oldEnv;
      return result;
    });
  }

  // Aggregation
  computeAggregate(func, values) {
    switch (func) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'mean':
      case 'avg':
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'std':
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      default:
        throw new KQLError(`Unknown aggregate function: ${func}`, 'AggregateError', null);
    }
  }

  // Compression
  applyCompression(data, spec) {
    const specs = Array.isArray(spec) ? spec : [spec];
    let result = data;
    const metas = [];

    for (const s of specs) {
      const compressed = this.compressWithMethod(result, s.method, s.params);
      result = compressed.data;
      metas.push({ method: s.method, params: s.params, ...compressed.meta });
    }

    return {
      data: result,
      meta: metas.length === 1 ? metas[0] : metas
    };
  }

  compressWithMethod(data, method, params = {}) {
    switch (method) {
      case 'scxq2':
        return this.scxq2Compress(data, params);
      case 'quantization':
        return this.quantizationCompress(data, params);
      case 'delta':
        return this.deltaCompress(data, params);
      case 'sparse':
        return this.sparseCompress(data, params);
      default:
        return { data, meta: { method: 'none' } };
    }
  }

  scxq2Compress(data, params) {
    const dictSize = params.dictSize || 2048;
    const blockSize = params.blockSize || 64;

    // Build dictionary from most frequent values
    const freq = {};
    for (const val of data) {
      const key = JSON.stringify(val);
      freq[key] = (freq[key] || 0) + 1;
    }

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const dict = sorted.slice(0, dictSize).map(([k]) => JSON.parse(k));
    const dictMap = new Map(dict.map((v, i) => [JSON.stringify(v), i]));

    // Encode data using dictionary
    const encoded = [];
    for (const val of data) {
      const key = JSON.stringify(val);
      if (dictMap.has(key)) {
        encoded.push(dictMap.get(key));
      } else {
        encoded.push(-1); // Literal marker
        encoded.push(val);
      }
    }

    return {
      data: { dict, encoded },
      meta: {
        method: 'scxq2',
        dictSize: dict.length,
        originalSize: data.length,
        compressedSize: encoded.length,
        ratio: data.length / encoded.length
      }
    };
  }

  quantizationCompress(data, params) {
    const bits = params.bits || 8;
    const scale = Math.pow(2, bits) - 1;

    // Find min/max for normalization
    const numericData = data.filter(d => typeof d === 'number');
    const min = Math.min(...numericData);
    const max = Math.max(...numericData);
    const range = max - min || 1;

    // Quantize
    const quantized = numericData.map(v => Math.round(((v - min) / range) * scale));

    return {
      data: { quantized, min, max, bits },
      meta: {
        method: 'quantization',
        bits,
        min,
        max,
        originalSize: data.length * 4,
        compressedSize: data.length * (bits / 8),
        ratio: 32 / bits
      }
    };
  }

  deltaCompress(data, params) {
    const reference = params.reference || 'previous';
    const deltas = [];
    let prev = 0;

    for (const val of data) {
      if (typeof val === 'number') {
        deltas.push(val - prev);
        prev = val;
      } else {
        deltas.push(val);
      }
    }

    return {
      data: { deltas, reference },
      meta: {
        method: 'delta',
        reference,
        originalSize: data.length,
        compressedSize: deltas.length
      }
    };
  }

  sparseCompress(data, params) {
    const threshold = params.threshold || 0.01;
    const indices = [];
    const values = [];

    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'number' && Math.abs(data[i]) > threshold) {
        indices.push(i);
        values.push(data[i]);
      }
    }

    return {
      data: { indices, values, originalLength: data.length, threshold },
      meta: {
        method: 'sparse',
        threshold,
        originalSize: data.length,
        nonZeroCount: indices.length,
        sparsity: 1 - (indices.length / data.length),
        ratio: data.length / (indices.length * 2)
      }
    };
  }

  applyDecompression(data, meta) {
    const metas = Array.isArray(meta) ? [...meta].reverse() : [meta];
    let result = data;

    for (const m of metas) {
      result = this.decompressWithMethod(result, m.method, m);
    }

    return result;
  }

  decompressWithMethod(data, method, meta) {
    switch (method) {
      case 'scxq2':
        return this.scxq2Decompress(data);
      case 'quantization':
        return this.quantizationDecompress(data);
      case 'delta':
        return this.deltaDecompress(data);
      case 'sparse':
        return this.sparseDecompress(data);
      default:
        return data;
    }
  }

  scxq2Decompress(data) {
    const { dict, encoded } = data;
    const result = [];
    let i = 0;

    while (i < encoded.length) {
      if (encoded[i] === -1) {
        result.push(encoded[i + 1]);
        i += 2;
      } else {
        result.push(dict[encoded[i]]);
        i++;
      }
    }

    return result;
  }

  quantizationDecompress(data) {
    const { quantized, min, max, bits } = data;
    const scale = Math.pow(2, bits) - 1;
    const range = max - min;

    return quantized.map(v => (v / scale) * range + min);
  }

  deltaDecompress(data) {
    const { deltas } = data;
    const result = [];
    let prev = 0;

    for (const delta of deltas) {
      if (typeof delta === 'number') {
        prev += delta;
        result.push(prev);
      } else {
        result.push(delta);
      }
    }

    return result;
  }

  sparseDecompress(data) {
    const { indices, values, originalLength } = data;
    const result = new Array(originalLength).fill(0);

    for (let i = 0; i < indices.length; i++) {
      result[indices[i]] = values[i];
    }

    return result;
  }

  applyDeltaEncodingToEvents(events) {
    events.sort((a, b) => a.timestamp - b.timestamp);
    let prevTimestamp = 0;

    for (const event of events) {
      const originalTimestamp = event.timestamp;
      event.deltaTimestamp = event.timestamp - prevTimestamp;
      prevTimestamp = originalTimestamp;
    }
  }

  // Database helpers
  async dbStore(store, record) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      const request = objectStore.put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async dbGet(store, key) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const objectStore = tx.objectStore(store);
      const request = objectStore.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async dbGetAll(store) {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const objectStore = tx.objectStore(store);
      const request = objectStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async dbQuery(store, query) {
    const all = await this.dbGetAll(store);
    return all.filter(record => {
      for (const [key, value] of Object.entries(query)) {
        if (record[key] !== value) return false;
      }
      return true;
    });
  }

  // Utility functions
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  computePhiSignature(data) {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const numericData = data.filter(d => typeof d === 'number');
    if (numericData.length === 0) return 0;

    const sum = numericData.reduce((a, b) => a + b, 0);
    return (sum * PHI) % 1;
  }

  computeEntropy(data) {
    const freq = {};
    for (const val of data) {
      const key = JSON.stringify(val);
      freq[key] = (freq[key] || 0) + 1;
    }

    const total = data.length;
    let entropy = 0;

    for (const count of Object.values(freq)) {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }
}

// ============================================================================
// KQL API (Main Interface)
// ============================================================================

class KQLAPI {
  constructor(db = null) {
    this.db = db;
    this.version = KQL_VERSION;
  }

  async query(kqlString) {
    try {
      // Lexer
      const lexer = new KQLLexer(kqlString);
      const tokens = lexer.tokenize();

      // Parser
      const parser = new KQLParser(tokens);
      const ast = parser.parse();

      // Executor
      const executor = new KQLExecutor(this.db);
      const result = await executor.execute(ast);

      return {
        success: true,
        version: this.version,
        result
      };
    } catch (error) {
      if (error instanceof KQLError) {
        return {
          success: false,
          version: this.version,
          error: error.toAST()
        };
      }
      throw error;
    }
  }

  parse(kqlString) {
    const lexer = new KQLLexer(kqlString);
    const tokens = lexer.tokenize();
    const parser = new KQLParser(tokens);
    return parser.parse();
  }

  tokenize(kqlString) {
    const lexer = new KQLLexer(kqlString);
    return lexer.tokenize();
  }

  async execute(ast) {
    const executor = new KQLExecutor(this.db);
    return executor.execute(ast);
  }

  validate(ast) {
    // Validate AST structure
    const errors = [];

    function validateNode(node, path = '') {
      if (!node || typeof node !== 'object') return;

      if (!node.type) {
        errors.push({ path, message: 'Missing type field' });
      }

      // Recursively validate children
      for (const [key, value] of Object.entries(node)) {
        if (key === 'location' || key === 'type') continue;

        if (Array.isArray(value)) {
          value.forEach((item, i) => validateNode(item, `${path}.${key}[${i}]`));
        } else if (typeof value === 'object' && value !== null) {
          validateNode(value, `${path}.${key}`);
        }
      }
    }

    validateNode(ast, 'root');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    KQLAPI,
    KQLLexer,
    KQLParser,
    KQLExecutor,
    KQLError,
    KQLSyntaxError,
    KQLTypeError,
    KQLReferenceError,
    KQLCompressionError,
    KQL_VERSION,
    PHI,
    PHI_INV
  };
}

// Global export for browser
if (typeof globalThis !== 'undefined') {
  globalThis.KQLAPI = KQLAPI;
  globalThis.KQLLexer = KQLLexer;
  globalThis.KQLParser = KQLParser;
  globalThis.KQLExecutor = KQLExecutor;
}
