/**
 * MX2LM SQL API Engine
 *
 * Provides SQL-like query interface over IndexedDB for the MX2LM runtime.
 * Supports SELECT, INSERT, UPDATE, DELETE with π-KUHUL extensions.
 *
 * Tables (mapped to IndexedDB object stores):
 *   - brains       : Brain topology definitions
 *   - agents       : Micro-agent registry
 *   - builders     : Builder registry
 *   - weights      : N-gram weight tables
 *   - traces       : Execution traces
 *   - deltas       : Weight deltas (RLHF)
 *   - metrics      : PI_METRIC_TABLE entries
 *   - cache        : Response cache
 *   - jobs         : Job queue
 *   - schemas      : SCXQ2 schemas
 *
 * Extensions:
 *   - π-KUHUL functions: PHI(), GOLDEN(), ENTROPY(), COMPRESS()
 *   - Glyph literals: ⊕, ⊗, →, ⤈, etc.
 *   - JSON path expressions: $.field.subfield
 *
 * @version 1.0.0
 * @law Ω-BLACK-PANEL
 */

'use strict';

// ============================================================================
// SQL Token Types
// ============================================================================

const SQL_TOKENS = {
  // Keywords
  SELECT: 'SELECT',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  FROM: 'FROM',
  INTO: 'INTO',
  WHERE: 'WHERE',
  SET: 'SET',
  VALUES: 'VALUES',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  IN: 'IN',
  LIKE: 'LIKE',
  BETWEEN: 'BETWEEN',
  IS: 'IS',
  NULL: 'NULL',
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  ORDER: 'ORDER',
  BY: 'BY',
  ASC: 'ASC',
  DESC: 'DESC',
  LIMIT: 'LIMIT',
  OFFSET: 'OFFSET',
  AS: 'AS',
  JOIN: 'JOIN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  INNER: 'INNER',
  ON: 'ON',
  GROUP: 'GROUP',
  HAVING: 'HAVING',
  COUNT: 'COUNT',
  SUM: 'SUM',
  AVG: 'AVG',
  MIN: 'MIN',
  MAX: 'MAX',
  DISTINCT: 'DISTINCT',

  // π-KUHUL Extensions
  PHI: 'PHI',
  GOLDEN: 'GOLDEN',
  ENTROPY: 'ENTROPY',
  COMPRESS: 'COMPRESS',
  GLYPH: 'GLYPH',
  KUHUL: 'KUHUL',

  // Literals & Identifiers
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  JSONPATH: 'JSONPATH',
  GLYPH_LITERAL: 'GLYPH_LITERAL',

  // Operators
  EQ: '=',
  NE: '!=',
  LT: '<',
  LE: '<=',
  GT: '>',
  GE: '>=',
  PLUS: '+',
  MINUS: '-',
  STAR: '*',
  SLASH: '/',
  PERCENT: '%',

  // Punctuation
  LPAREN: '(',
  RPAREN: ')',
  COMMA: ',',
  SEMICOLON: ';',
  DOT: '.',

  // Special
  EOF: 'EOF',
  UNKNOWN: 'UNKNOWN'
};

// Glyph operators recognized as literals
const GLYPH_OPERATORS = new Set(['⟁', '⊕', '⊗', '→', '⤈', '⨁', '⨂', '🛑', 'Ω', 'π', 'φ', 'Δ', '∇', '∞']);

// SQL Keywords set for quick lookup
const SQL_KEYWORDS = new Set([
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'INTO', 'WHERE', 'SET',
  'VALUES', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'TRUE', 'FALSE', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'AS',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'GROUP', 'HAVING',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT',
  'PHI', 'GOLDEN', 'ENTROPY', 'COMPRESS', 'GLYPH', 'KUHUL'
]);

// ============================================================================
// SQL Lexer
// ============================================================================

class SQLLexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
  }

  peek(offset = 0) {
    return this.input[this.pos + offset] || '';
  }

  advance() {
    const ch = this.input[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  skipWhitespace() {
    while (/\s/.test(this.peek())) {
      this.advance();
    }
  }

  skipComment() {
    if (this.peek() === '-' && this.peek(1) === '-') {
      // Single-line comment
      while (this.peek() && this.peek() !== '\n') {
        this.advance();
      }
      return true;
    }
    if (this.peek() === '/' && this.peek(1) === '*') {
      // Multi-line comment
      this.advance(); // /
      this.advance(); // *
      while (this.peek()) {
        if (this.peek() === '*' && this.peek(1) === '/') {
          this.advance(); // *
          this.advance(); // /
          break;
        }
        this.advance();
      }
      return true;
    }
    return false;
  }

  readString(quote) {
    this.advance(); // opening quote
    let value = '';
    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          default: value += escaped;
        }
      } else {
        value += this.advance();
      }
    }
    if (this.peek() === quote) {
      this.advance(); // closing quote
    }
    return { type: SQL_TOKENS.STRING, value };
  }

  readNumber() {
    let value = '';
    let hasDot = false;

    if (this.peek() === '-') {
      value += this.advance();
    }

    while (/[0-9]/.test(this.peek()) || (this.peek() === '.' && !hasDot)) {
      if (this.peek() === '.') hasDot = true;
      value += this.advance();
    }

    // Scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    return { type: SQL_TOKENS.NUMBER, value: parseFloat(value) };
  }

  readIdentifier() {
    let value = '';

    // Handle quoted identifiers
    if (this.peek() === '"' || this.peek() === '`') {
      const quote = this.advance();
      while (this.peek() && this.peek() !== quote) {
        value += this.advance();
      }
      if (this.peek() === quote) this.advance();
      return { type: SQL_TOKENS.IDENTIFIER, value };
    }

    // Regular identifier
    while (/[a-zA-Z0-9_$]/.test(this.peek())) {
      value += this.advance();
    }

    const upper = value.toUpperCase();
    if (SQL_KEYWORDS.has(upper)) {
      return { type: upper, value: upper };
    }

    return { type: SQL_TOKENS.IDENTIFIER, value };
  }

  readJSONPath() {
    let value = this.advance(); // $
    while (this.peek() && /[a-zA-Z0-9_.\[\]]/.test(this.peek())) {
      value += this.advance();
    }
    return { type: SQL_TOKENS.JSONPATH, value };
  }

  nextToken() {
    // Skip whitespace and comments
    while (true) {
      this.skipWhitespace();
      if (!this.skipComment()) break;
    }

    if (this.pos >= this.input.length) {
      return { type: SQL_TOKENS.EOF, value: null };
    }

    const ch = this.peek();
    const loc = { line: this.line, column: this.column };

    // Glyph literals
    if (GLYPH_OPERATORS.has(ch)) {
      return { type: SQL_TOKENS.GLYPH_LITERAL, value: this.advance(), ...loc };
    }

    // JSON path
    if (ch === '$') {
      return { ...this.readJSONPath(), ...loc };
    }

    // String literals
    if (ch === "'" || ch === '"') {
      return { ...this.readString(ch), ...loc };
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(this.peek(1)))) {
      return { ...this.readNumber(), ...loc };
    }

    // Identifiers and keywords
    if (/[a-zA-Z_`"]/.test(ch)) {
      return { ...this.readIdentifier(), ...loc };
    }

    // Two-character operators
    if (ch === '!' && this.peek(1) === '=') {
      this.advance(); this.advance();
      return { type: SQL_TOKENS.NE, value: '!=', ...loc };
    }
    if (ch === '<' && this.peek(1) === '=') {
      this.advance(); this.advance();
      return { type: SQL_TOKENS.LE, value: '<=', ...loc };
    }
    if (ch === '>' && this.peek(1) === '=') {
      this.advance(); this.advance();
      return { type: SQL_TOKENS.GE, value: '>=', ...loc };
    }
    if (ch === '<' && this.peek(1) === '>') {
      this.advance(); this.advance();
      return { type: SQL_TOKENS.NE, value: '<>', ...loc };
    }

    // Single-character operators
    const singleOps = {
      '=': SQL_TOKENS.EQ,
      '<': SQL_TOKENS.LT,
      '>': SQL_TOKENS.GT,
      '+': SQL_TOKENS.PLUS,
      '-': SQL_TOKENS.MINUS,
      '*': SQL_TOKENS.STAR,
      '/': SQL_TOKENS.SLASH,
      '%': SQL_TOKENS.PERCENT,
      '(': SQL_TOKENS.LPAREN,
      ')': SQL_TOKENS.RPAREN,
      ',': SQL_TOKENS.COMMA,
      ';': SQL_TOKENS.SEMICOLON,
      '.': SQL_TOKENS.DOT
    };

    if (singleOps[ch]) {
      return { type: singleOps[ch], value: this.advance(), ...loc };
    }

    // Unknown character
    return { type: SQL_TOKENS.UNKNOWN, value: this.advance(), ...loc };
  }

  tokenize() {
    const tokens = [];
    let token;
    while ((token = this.nextToken()).type !== SQL_TOKENS.EOF) {
      tokens.push(token);
    }
    tokens.push(token); // EOF
    return tokens;
  }
}

// ============================================================================
// SQL Parser
// ============================================================================

class SQLParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || { type: SQL_TOKENS.EOF };
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type) {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at line ${token.line}`);
    }
    return this.advance();
  }

  match(...types) {
    if (types.includes(this.peek().type)) {
      return this.advance();
    }
    return null;
  }

  parse() {
    const statements = [];
    while (this.peek().type !== SQL_TOKENS.EOF) {
      statements.push(this.parseStatement());
      this.match(SQL_TOKENS.SEMICOLON);
    }
    return statements;
  }

  parseStatement() {
    const token = this.peek();
    switch (token.type) {
      case SQL_TOKENS.SELECT: return this.parseSelect();
      case SQL_TOKENS.INSERT: return this.parseInsert();
      case SQL_TOKENS.UPDATE: return this.parseUpdate();
      case SQL_TOKENS.DELETE: return this.parseDelete();
      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }
  }

  // SELECT columns FROM table [WHERE condition] [ORDER BY ...] [LIMIT n]
  parseSelect() {
    this.expect(SQL_TOKENS.SELECT);

    const distinct = !!this.match(SQL_TOKENS.DISTINCT);
    const columns = this.parseSelectColumns();

    this.expect(SQL_TOKENS.FROM);
    const table = this.parseTableRef();

    let joins = [];
    while (this.peek().type === SQL_TOKENS.JOIN ||
           this.peek().type === SQL_TOKENS.LEFT ||
           this.peek().type === SQL_TOKENS.RIGHT ||
           this.peek().type === SQL_TOKENS.INNER) {
      joins.push(this.parseJoin());
    }

    let where = null;
    if (this.match(SQL_TOKENS.WHERE)) {
      where = this.parseExpression();
    }

    let groupBy = null;
    if (this.match(SQL_TOKENS.GROUP)) {
      this.expect(SQL_TOKENS.BY);
      groupBy = this.parseExpressionList();
    }

    let having = null;
    if (this.match(SQL_TOKENS.HAVING)) {
      having = this.parseExpression();
    }

    let orderBy = null;
    if (this.match(SQL_TOKENS.ORDER)) {
      this.expect(SQL_TOKENS.BY);
      orderBy = this.parseOrderByList();
    }

    let limit = null;
    let offset = null;
    if (this.match(SQL_TOKENS.LIMIT)) {
      limit = this.expect(SQL_TOKENS.NUMBER).value;
      if (this.match(SQL_TOKENS.OFFSET)) {
        offset = this.expect(SQL_TOKENS.NUMBER).value;
      }
    }

    return {
      type: 'SELECT',
      distinct,
      columns,
      table,
      joins,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset
    };
  }

  parseSelectColumns() {
    if (this.match(SQL_TOKENS.STAR)) {
      return [{ type: 'star' }];
    }

    const columns = [];
    do {
      const expr = this.parseExpression();
      let alias = null;
      if (this.match(SQL_TOKENS.AS)) {
        alias = this.expect(SQL_TOKENS.IDENTIFIER).value;
      }
      columns.push({ expr, alias });
    } while (this.match(SQL_TOKENS.COMMA));

    return columns;
  }

  parseTableRef() {
    const name = this.expect(SQL_TOKENS.IDENTIFIER).value;
    let alias = null;
    if (this.match(SQL_TOKENS.AS)) {
      alias = this.expect(SQL_TOKENS.IDENTIFIER).value;
    } else if (this.peek().type === SQL_TOKENS.IDENTIFIER) {
      alias = this.advance().value;
    }
    return { name, alias };
  }

  parseJoin() {
    let joinType = 'INNER';
    if (this.match(SQL_TOKENS.LEFT)) {
      joinType = 'LEFT';
      this.match(SQL_TOKENS.JOIN);
    } else if (this.match(SQL_TOKENS.RIGHT)) {
      joinType = 'RIGHT';
      this.match(SQL_TOKENS.JOIN);
    } else if (this.match(SQL_TOKENS.INNER)) {
      this.match(SQL_TOKENS.JOIN);
    } else {
      this.expect(SQL_TOKENS.JOIN);
    }

    const table = this.parseTableRef();
    this.expect(SQL_TOKENS.ON);
    const condition = this.parseExpression();

    return { type: joinType, table, condition };
  }

  parseOrderByList() {
    const items = [];
    do {
      const expr = this.parseExpression();
      let direction = 'ASC';
      if (this.match(SQL_TOKENS.DESC)) {
        direction = 'DESC';
      } else {
        this.match(SQL_TOKENS.ASC);
      }
      items.push({ expr, direction });
    } while (this.match(SQL_TOKENS.COMMA));
    return items;
  }

  // INSERT INTO table (columns) VALUES (values)
  parseInsert() {
    this.expect(SQL_TOKENS.INSERT);
    this.expect(SQL_TOKENS.INTO);

    const table = this.expect(SQL_TOKENS.IDENTIFIER).value;

    let columns = null;
    if (this.match(SQL_TOKENS.LPAREN)) {
      columns = [];
      do {
        columns.push(this.expect(SQL_TOKENS.IDENTIFIER).value);
      } while (this.match(SQL_TOKENS.COMMA));
      this.expect(SQL_TOKENS.RPAREN);
    }

    this.expect(SQL_TOKENS.VALUES);

    const rows = [];
    do {
      this.expect(SQL_TOKENS.LPAREN);
      const values = this.parseExpressionList();
      this.expect(SQL_TOKENS.RPAREN);
      rows.push(values);
    } while (this.match(SQL_TOKENS.COMMA));

    return { type: 'INSERT', table, columns, rows };
  }

  // UPDATE table SET col=val [WHERE condition]
  parseUpdate() {
    this.expect(SQL_TOKENS.UPDATE);
    const table = this.expect(SQL_TOKENS.IDENTIFIER).value;
    this.expect(SQL_TOKENS.SET);

    const assignments = [];
    do {
      const column = this.expect(SQL_TOKENS.IDENTIFIER).value;
      this.expect(SQL_TOKENS.EQ);
      const value = this.parseExpression();
      assignments.push({ column, value });
    } while (this.match(SQL_TOKENS.COMMA));

    let where = null;
    if (this.match(SQL_TOKENS.WHERE)) {
      where = this.parseExpression();
    }

    return { type: 'UPDATE', table, assignments, where };
  }

  // DELETE FROM table [WHERE condition]
  parseDelete() {
    this.expect(SQL_TOKENS.DELETE);
    this.expect(SQL_TOKENS.FROM);
    const table = this.expect(SQL_TOKENS.IDENTIFIER).value;

    let where = null;
    if (this.match(SQL_TOKENS.WHERE)) {
      where = this.parseExpression();
    }

    return { type: 'DELETE', table, where };
  }

  parseExpressionList() {
    const exprs = [];
    do {
      exprs.push(this.parseExpression());
    } while (this.match(SQL_TOKENS.COMMA));
    return exprs;
  }

  // Expression parsing with precedence
  parseExpression() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.match(SQL_TOKENS.OR)) {
      const right = this.parseAnd();
      left = { type: 'binary', op: 'OR', left, right };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.match(SQL_TOKENS.AND)) {
      const right = this.parseNot();
      left = { type: 'binary', op: 'AND', left, right };
    }
    return left;
  }

  parseNot() {
    if (this.match(SQL_TOKENS.NOT)) {
      return { type: 'unary', op: 'NOT', operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAddSub();

    // IS NULL / IS NOT NULL
    if (this.match(SQL_TOKENS.IS)) {
      const not = !!this.match(SQL_TOKENS.NOT);
      this.expect(SQL_TOKENS.NULL);
      return { type: 'isnull', operand: left, not };
    }

    // IN (values)
    if (this.match(SQL_TOKENS.IN)) {
      this.expect(SQL_TOKENS.LPAREN);
      const values = this.parseExpressionList();
      this.expect(SQL_TOKENS.RPAREN);
      return { type: 'in', operand: left, values };
    }

    // BETWEEN a AND b
    if (this.match(SQL_TOKENS.BETWEEN)) {
      const low = this.parseAddSub();
      this.expect(SQL_TOKENS.AND);
      const high = this.parseAddSub();
      return { type: 'between', operand: left, low, high };
    }

    // LIKE pattern
    if (this.match(SQL_TOKENS.LIKE)) {
      const pattern = this.parseAddSub();
      return { type: 'like', operand: left, pattern };
    }

    // Comparison operators
    const ops = [SQL_TOKENS.EQ, SQL_TOKENS.NE, SQL_TOKENS.LT, SQL_TOKENS.LE, SQL_TOKENS.GT, SQL_TOKENS.GE];
    for (const op of ops) {
      if (this.match(op)) {
        const right = this.parseAddSub();
        return { type: 'binary', op, left, right };
      }
    }

    return left;
  }

  parseAddSub() {
    let left = this.parseMulDiv();
    while (true) {
      if (this.match(SQL_TOKENS.PLUS)) {
        left = { type: 'binary', op: '+', left, right: this.parseMulDiv() };
      } else if (this.match(SQL_TOKENS.MINUS)) {
        left = { type: 'binary', op: '-', left, right: this.parseMulDiv() };
      } else {
        break;
      }
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parseUnary();
    while (true) {
      if (this.match(SQL_TOKENS.STAR)) {
        left = { type: 'binary', op: '*', left, right: this.parseUnary() };
      } else if (this.match(SQL_TOKENS.SLASH)) {
        left = { type: 'binary', op: '/', left, right: this.parseUnary() };
      } else if (this.match(SQL_TOKENS.PERCENT)) {
        left = { type: 'binary', op: '%', left, right: this.parseUnary() };
      } else {
        break;
      }
    }
    return left;
  }

  parseUnary() {
    if (this.match(SQL_TOKENS.MINUS)) {
      return { type: 'unary', op: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();

    // Parenthesized expression
    if (this.match(SQL_TOKENS.LPAREN)) {
      const expr = this.parseExpression();
      this.expect(SQL_TOKENS.RPAREN);
      return expr;
    }

    // Literals
    if (this.match(SQL_TOKENS.NUMBER)) {
      return { type: 'literal', value: token.value };
    }
    if (this.match(SQL_TOKENS.STRING)) {
      return { type: 'literal', value: token.value };
    }
    if (this.match(SQL_TOKENS.NULL)) {
      return { type: 'literal', value: null };
    }
    if (this.match(SQL_TOKENS.TRUE)) {
      return { type: 'literal', value: true };
    }
    if (this.match(SQL_TOKENS.FALSE)) {
      return { type: 'literal', value: false };
    }
    if (this.match(SQL_TOKENS.GLYPH_LITERAL)) {
      return { type: 'glyph', value: token.value };
    }
    if (this.match(SQL_TOKENS.JSONPATH)) {
      return { type: 'jsonpath', value: token.value };
    }

    // Aggregate functions
    const aggFuncs = [SQL_TOKENS.COUNT, SQL_TOKENS.SUM, SQL_TOKENS.AVG, SQL_TOKENS.MIN, SQL_TOKENS.MAX];
    for (const func of aggFuncs) {
      if (this.match(func)) {
        this.expect(SQL_TOKENS.LPAREN);
        const distinct = !!this.match(SQL_TOKENS.DISTINCT);
        let arg;
        if (this.match(SQL_TOKENS.STAR)) {
          arg = { type: 'star' };
        } else {
          arg = this.parseExpression();
        }
        this.expect(SQL_TOKENS.RPAREN);
        return { type: 'aggregate', func, distinct, arg };
      }
    }

    // π-KUHUL functions
    const kuhulFuncs = [SQL_TOKENS.PHI, SQL_TOKENS.GOLDEN, SQL_TOKENS.ENTROPY, SQL_TOKENS.COMPRESS, SQL_TOKENS.GLYPH, SQL_TOKENS.KUHUL];
    for (const func of kuhulFuncs) {
      if (this.match(func)) {
        this.expect(SQL_TOKENS.LPAREN);
        const args = this.peek().type !== SQL_TOKENS.RPAREN ? this.parseExpressionList() : [];
        this.expect(SQL_TOKENS.RPAREN);
        return { type: 'kuhul_func', func, args };
      }
    }

    // Identifier (column reference)
    if (token.type === SQL_TOKENS.IDENTIFIER) {
      this.advance();

      // Check for function call
      if (this.match(SQL_TOKENS.LPAREN)) {
        const args = this.peek().type !== SQL_TOKENS.RPAREN ? this.parseExpressionList() : [];
        this.expect(SQL_TOKENS.RPAREN);
        return { type: 'function', name: token.value, args };
      }

      // Check for table.column
      if (this.match(SQL_TOKENS.DOT)) {
        const column = this.expect(SQL_TOKENS.IDENTIFIER).value;
        return { type: 'column', table: token.value, name: column };
      }

      return { type: 'column', name: token.value };
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }
}

// ============================================================================
// SQL Executor
// ============================================================================

// π-KUHUL constants
const PHI = (1 + Math.sqrt(5)) / 2;  // Golden ratio φ ≈ 1.618
const PHI_INV = PHI - 1;              // 1/φ ≈ 0.618

class SQLExecutor {
  constructor(db) {
    this.db = db; // IndexedDB database reference
    this.tables = new Map(); // In-memory table cache
  }

  // Register a table (object store or virtual table)
  registerTable(name, data) {
    this.tables.set(name.toLowerCase(), data);
  }

  async execute(ast) {
    switch (ast.type) {
      case 'SELECT': return this.executeSelect(ast);
      case 'INSERT': return this.executeInsert(ast);
      case 'UPDATE': return this.executeUpdate(ast);
      case 'DELETE': return this.executeDelete(ast);
      default:
        throw new Error(`Unknown statement type: ${ast.type}`);
    }
  }

  async getTableData(tableName) {
    const name = tableName.toLowerCase();

    // Check in-memory tables first
    if (this.tables.has(name)) {
      const data = this.tables.get(name);
      return typeof data === 'function' ? await data() : data;
    }

    // Try IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db.transaction(tableName, 'readonly');
          const store = tx.objectStore(tableName);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        } catch (e) {
          // Object store doesn't exist
          resolve([]);
        }
      });
    }

    return [];
  }

  async executeSelect(ast) {
    // Get base table data
    let rows = await this.getTableData(ast.table.name);
    const tableAlias = ast.table.alias || ast.table.name;

    // Apply aliases
    rows = rows.map(row => ({ [tableAlias]: row, ...row }));

    // Handle JOINs
    for (const join of ast.joins) {
      const joinData = await this.getTableData(join.table.name);
      const joinAlias = join.table.alias || join.table.name;

      const newRows = [];
      for (const row of rows) {
        let matched = false;
        for (const joinRow of joinData) {
          const combined = { ...row, [joinAlias]: joinRow };
          if (this.evaluateExpr(join.condition, combined)) {
            newRows.push(combined);
            matched = true;
          }
        }
        if (!matched && join.type === 'LEFT') {
          newRows.push({ ...row, [joinAlias]: null });
        }
      }
      rows = newRows;
    }

    // Apply WHERE filter
    if (ast.where) {
      rows = rows.filter(row => this.evaluateExpr(ast.where, row));
    }

    // Apply GROUP BY
    if (ast.groupBy) {
      const groups = new Map();
      for (const row of rows) {
        const key = ast.groupBy.map(e => JSON.stringify(this.evaluateExpr(e, row))).join('|');
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(row);
      }

      rows = Array.from(groups.entries()).map(([key, groupRows]) => ({
        __group__: groupRows,
        __first__: groupRows[0]
      }));

      // Apply HAVING
      if (ast.having) {
        rows = rows.filter(row => this.evaluateExpr(ast.having, row, true));
      }
    }

    // Apply ORDER BY
    if (ast.orderBy) {
      rows.sort((a, b) => {
        for (const item of ast.orderBy) {
          const aVal = this.evaluateExpr(item.expr, a);
          const bVal = this.evaluateExpr(item.expr, b);
          let cmp = 0;
          if (aVal < bVal) cmp = -1;
          else if (aVal > bVal) cmp = 1;
          if (item.direction === 'DESC') cmp = -cmp;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    // Apply DISTINCT
    if (ast.distinct) {
      const seen = new Set();
      rows = rows.filter(row => {
        const key = JSON.stringify(this.projectRow(row, ast.columns));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Apply LIMIT and OFFSET
    if (ast.offset) {
      rows = rows.slice(ast.offset);
    }
    if (ast.limit) {
      rows = rows.slice(0, ast.limit);
    }

    // Project columns
    const result = rows.map(row => this.projectRow(row, ast.columns));

    return {
      success: true,
      rows: result,
      rowCount: result.length
    };
  }

  projectRow(row, columns) {
    if (columns.length === 1 && columns[0].type === 'star') {
      // Remove internal properties
      const result = { ...row };
      delete result.__group__;
      delete result.__first__;
      return result;
    }

    const projected = {};
    for (const col of columns) {
      const value = this.evaluateExpr(col.expr, row, !!row.__group__);
      const name = col.alias || this.getExprName(col.expr);
      projected[name] = value;
    }
    return projected;
  }

  getExprName(expr) {
    if (expr.type === 'column') {
      return expr.name;
    }
    if (expr.type === 'aggregate') {
      return `${expr.func}(${expr.arg.type === 'star' ? '*' : this.getExprName(expr.arg)})`;
    }
    return 'expr';
  }

  evaluateExpr(expr, row, isGrouped = false) {
    switch (expr.type) {
      case 'literal':
        return expr.value;

      case 'glyph':
        return expr.value;

      case 'jsonpath':
        return this.evaluateJSONPath(expr.value, row);

      case 'column': {
        if (isGrouped && row.__first__) {
          row = row.__first__;
        }
        if (expr.table) {
          return row[expr.table]?.[expr.name];
        }
        return row[expr.name];
      }

      case 'binary': {
        const left = this.evaluateExpr(expr.left, row, isGrouped);
        const right = this.evaluateExpr(expr.right, row, isGrouped);
        return this.evaluateBinaryOp(expr.op, left, right);
      }

      case 'unary': {
        const operand = this.evaluateExpr(expr.operand, row, isGrouped);
        if (expr.op === 'NOT') return !operand;
        if (expr.op === '-') return -operand;
        return operand;
      }

      case 'isnull': {
        const val = this.evaluateExpr(expr.operand, row, isGrouped);
        const isNull = val === null || val === undefined;
        return expr.not ? !isNull : isNull;
      }

      case 'in': {
        const val = this.evaluateExpr(expr.operand, row, isGrouped);
        const values = expr.values.map(v => this.evaluateExpr(v, row, isGrouped));
        return values.includes(val);
      }

      case 'between': {
        const val = this.evaluateExpr(expr.operand, row, isGrouped);
        const low = this.evaluateExpr(expr.low, row, isGrouped);
        const high = this.evaluateExpr(expr.high, row, isGrouped);
        return val >= low && val <= high;
      }

      case 'like': {
        const val = String(this.evaluateExpr(expr.operand, row, isGrouped));
        const pattern = String(this.evaluateExpr(expr.pattern, row, isGrouped));
        const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
        return regex.test(val);
      }

      case 'aggregate': {
        const groupRows = row.__group__ || [row];
        return this.evaluateAggregate(expr, groupRows);
      }

      case 'kuhul_func':
        return this.evaluateKuhulFunc(expr, row, isGrouped);

      case 'function':
        return this.evaluateFunction(expr, row, isGrouped);

      case 'star':
        return '*';

      default:
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
  }

  evaluateBinaryOp(op, left, right) {
    switch (op) {
      case 'AND': return left && right;
      case 'OR': return left || right;
      case SQL_TOKENS.EQ:
      case '=': return left === right;
      case SQL_TOKENS.NE:
      case '!=':
      case '<>': return left !== right;
      case SQL_TOKENS.LT:
      case '<': return left < right;
      case SQL_TOKENS.LE:
      case '<=': return left <= right;
      case SQL_TOKENS.GT:
      case '>': return left > right;
      case SQL_TOKENS.GE:
      case '>=': return left >= right;
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right !== 0 ? left / right : null;
      case '%': return left % right;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  evaluateAggregate(expr, rows) {
    let values = rows.map(row =>
      expr.arg.type === 'star' ? row : this.evaluateExpr(expr.arg, row)
    );

    if (expr.distinct) {
      values = [...new Set(values)];
    }

    switch (expr.func) {
      case 'COUNT':
        return values.filter(v => v !== null && v !== undefined).length;
      case 'SUM':
        return values.reduce((a, b) => a + (Number(b) || 0), 0);
      case 'AVG': {
        const nums = values.filter(v => typeof v === 'number');
        return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      }
      case 'MIN':
        return values.length > 0 ? Math.min(...values.filter(v => v != null)) : null;
      case 'MAX':
        return values.length > 0 ? Math.max(...values.filter(v => v != null)) : null;
      default:
        throw new Error(`Unknown aggregate: ${expr.func}`);
    }
  }

  evaluateKuhulFunc(expr, row, isGrouped) {
    const args = expr.args.map(a => this.evaluateExpr(a, row, isGrouped));

    switch (expr.func) {
      case 'PHI':
        // PHI(n) = φ^n
        return Math.pow(PHI, args[0] || 1);

      case 'GOLDEN':
        // GOLDEN(x) = x * φ
        return (args[0] || 1) * PHI;

      case 'ENTROPY':
        // ENTROPY(values...) = -Σ p*log2(p)
        if (args.length === 0) return 0;
        const total = args.reduce((a, b) => a + Math.abs(b), 0);
        if (total === 0) return 0;
        return -args.reduce((sum, v) => {
          const p = Math.abs(v) / total;
          return p > 0 ? sum + p * Math.log2(p) : sum;
        }, 0);

      case 'COMPRESS':
        // COMPRESS(string) = estimated compression ratio
        if (typeof args[0] !== 'string') return 1;
        const str = args[0];
        const unique = new Set(str).size;
        return unique / Math.max(str.length, 1);

      case 'GLYPH':
        // GLYPH(code) = glyph character
        const glyphMap = { 0: '⟁', 1: '⊕', 2: '⊗', 3: '→', 4: '⤈', 5: '⨁', 6: '⨂', 7: '🛑' };
        return glyphMap[args[0]] || args[0];

      case 'KUHUL':
        // KUHUL(script) = parse and return opcode count
        if (typeof args[0] !== 'string') return 0;
        return (args[0].match(/[⟁⊕⊗→⤈⨁⨂🛑]/g) || []).length;

      default:
        throw new Error(`Unknown π-KUHUL function: ${expr.func}`);
    }
  }

  evaluateFunction(expr, row, isGrouped) {
    const args = expr.args.map(a => this.evaluateExpr(a, row, isGrouped));
    const name = expr.name.toUpperCase();

    // Standard SQL functions
    switch (name) {
      case 'COALESCE':
        return args.find(a => a !== null && a !== undefined) ?? null;
      case 'NULLIF':
        return args[0] === args[1] ? null : args[0];
      case 'IFNULL':
        return args[0] ?? args[1];
      case 'ABS':
        return Math.abs(args[0]);
      case 'ROUND':
        return Math.round(args[0] * Math.pow(10, args[1] || 0)) / Math.pow(10, args[1] || 0);
      case 'FLOOR':
        return Math.floor(args[0]);
      case 'CEIL':
      case 'CEILING':
        return Math.ceil(args[0]);
      case 'SQRT':
        return Math.sqrt(args[0]);
      case 'POWER':
      case 'POW':
        return Math.pow(args[0], args[1]);
      case 'LOG':
        return Math.log(args[0]);
      case 'LOG10':
        return Math.log10(args[0]);
      case 'EXP':
        return Math.exp(args[0]);
      case 'SIN':
        return Math.sin(args[0]);
      case 'COS':
        return Math.cos(args[0]);
      case 'TAN':
        return Math.tan(args[0]);
      case 'UPPER':
        return String(args[0]).toUpperCase();
      case 'LOWER':
        return String(args[0]).toLowerCase();
      case 'LENGTH':
      case 'LEN':
        return String(args[0]).length;
      case 'TRIM':
        return String(args[0]).trim();
      case 'LTRIM':
        return String(args[0]).trimStart();
      case 'RTRIM':
        return String(args[0]).trimEnd();
      case 'SUBSTR':
      case 'SUBSTRING':
        return String(args[0]).substring(args[1] - 1, args[2] ? args[1] - 1 + args[2] : undefined);
      case 'CONCAT':
        return args.join('');
      case 'REPLACE':
        return String(args[0]).replace(new RegExp(args[1], 'g'), args[2]);
      case 'INSTR':
        return String(args[0]).indexOf(args[1]) + 1;
      case 'NOW':
        return Date.now();
      case 'DATE':
        return new Date(args[0]).toISOString().split('T')[0];
      case 'JSON_EXTRACT':
        return this.evaluateJSONPath(args[1], JSON.parse(args[0]));
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  evaluateJSONPath(path, obj) {
    // Simple JSON path: $.field.subfield or $.array[0]
    const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }
    return current;
  }

  async executeInsert(ast) {
    const tableName = ast.table.toLowerCase();

    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }

    const table = this.tables.get(tableName);
    if (typeof table === 'function') {
      throw new Error(`Cannot insert into virtual table: ${ast.table}`);
    }

    let inserted = 0;
    for (const rowValues of ast.rows) {
      const row = {};
      const values = rowValues.map(v => this.evaluateExpr(v, {}));

      if (ast.columns) {
        for (let i = 0; i < ast.columns.length; i++) {
          row[ast.columns[i]] = values[i];
        }
      } else {
        // No columns specified - use indexed keys
        for (let i = 0; i < values.length; i++) {
          row[`col${i}`] = values[i];
        }
      }

      // Generate ID if not present
      if (!row.id) {
        row.id = `${tableName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      table.push(row);
      inserted++;
    }

    return {
      success: true,
      rowsAffected: inserted,
      message: `Inserted ${inserted} row(s)`
    };
  }

  async executeUpdate(ast) {
    const tableName = ast.table.toLowerCase();
    let table = await this.getTableData(tableName);

    if (typeof table === 'function') {
      throw new Error(`Cannot update virtual table: ${ast.table}`);
    }

    let updated = 0;
    for (const row of table) {
      if (!ast.where || this.evaluateExpr(ast.where, row)) {
        for (const { column, value } of ast.assignments) {
          row[column] = this.evaluateExpr(value, row);
        }
        updated++;
      }
    }

    // Update in-memory cache
    this.tables.set(tableName, table);

    return {
      success: true,
      rowsAffected: updated,
      message: `Updated ${updated} row(s)`
    };
  }

  async executeDelete(ast) {
    const tableName = ast.table.toLowerCase();
    let table = await this.getTableData(tableName);

    if (typeof table === 'function') {
      throw new Error(`Cannot delete from virtual table: ${ast.table}`);
    }

    const originalLength = table.length;
    table = table.filter(row => ast.where && !this.evaluateExpr(ast.where, row));
    const deleted = originalLength - table.length;

    // Update in-memory cache
    this.tables.set(tableName, table);

    return {
      success: true,
      rowsAffected: deleted,
      message: `Deleted ${deleted} row(s)`
    };
  }
}

// ============================================================================
// High-Level API
// ============================================================================

/**
 * Parse SQL query string into AST
 * @param {string} sql - SQL query string
 * @returns {object[]} Array of statement ASTs
 */
function sqlParse(sql) {
  const lexer = new SQLLexer(sql);
  const tokens = lexer.tokenize();
  const parser = new SQLParser(tokens);
  return parser.parse();
}

/**
 * Create a new SQL executor with optional IndexedDB connection
 * @param {IDBDatabase} [db] - Optional IndexedDB database
 * @returns {SQLExecutor} Executor instance
 */
function createSQLExecutor(db = null) {
  return new SQLExecutor(db);
}

/**
 * Execute SQL query and return results
 * @param {string} sql - SQL query string
 * @param {object} [options] - Options { db, tables }
 * @returns {Promise<object>} Query results
 */
async function sqlQuery(sql, options = {}) {
  const ast = sqlParse(sql);
  const executor = createSQLExecutor(options.db);

  // Register any provided tables
  if (options.tables) {
    for (const [name, data] of Object.entries(options.tables)) {
      executor.registerTable(name, data);
    }
  }

  // Execute all statements
  const results = [];
  for (const stmt of ast) {
    results.push(await executor.execute(stmt));
  }

  return results.length === 1 ? results[0] : results;
}

/**
 * Register default MX2LM tables (virtual tables for system data)
 * @param {SQLExecutor} executor - SQL executor
 * @param {object} mx2State - MX2LM state object
 */
function registerMX2Tables(executor, mx2State = {}) {
  // Brains table
  executor.registerTable('brains', () => {
    return Object.entries(mx2State.brains || {}).map(([id, brain]) => ({
      id,
      name: brain.name || id,
      type: brain.type || 'unknown',
      layers: (brain.layers || []).length,
      created_at: brain.created_at || null
    }));
  });

  // Agents table
  executor.registerTable('agents', () => {
    return Object.entries(mx2State.agents || {}).map(([id, agent]) => ({
      id,
      name: agent.name || id,
      generation: agent.generation || 0,
      status: agent.status || 'idle',
      last_active: agent.last_active || null
    }));
  });

  // Metrics table
  executor.registerTable('metrics', () => {
    return Object.entries(mx2State.metrics || {}).map(([id, metric]) => ({
      id,
      name: metric.name || id,
      value: metric.value,
      effect: metric.effect || 'unknown',
      timestamp: metric.timestamp || Date.now()
    }));
  });

  // Weights table
  executor.registerTable('weights', () => {
    return (mx2State.weights || []).map((w, i) => ({
      id: i,
      sequence: w.seq,
      weight: w.weight,
      count: w.count || 1,
      last_updated: w.last_updated || null
    }));
  });

  // Traces table
  executor.registerTable('traces', () => {
    return (mx2State.traces || []).map(t => ({
      id: t.id,
      tick: t.tick,
      operation: t.op,
      input_hash: t.input_hash,
      output_hash: t.output_hash,
      duration_ms: t.duration_ms
    }));
  });

  // System info virtual table
  executor.registerTable('sys_info', () => [{
    version: mx2State.version || '19.0.0',
    uptime_ms: Date.now() - (mx2State.start_time || Date.now()),
    phi: PHI,
    phi_inv: PHI_INV,
    tick: mx2State.tick || 0
  }]);
}

// ============================================================================
// Exports
// ============================================================================

// For ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SQLLexer,
    SQLParser,
    SQLExecutor,
    sqlParse,
    sqlQuery,
    createSQLExecutor,
    registerMX2Tables,
    SQL_TOKENS,
    PHI,
    PHI_INV
  };
}

// For browser/service worker
if (typeof self !== 'undefined') {
  self.SQLLexer = SQLLexer;
  self.SQLParser = SQLParser;
  self.SQLExecutor = SQLExecutor;
  self.sqlParse = sqlParse;
  self.sqlQuery = sqlQuery;
  self.createSQLExecutor = createSQLExecutor;
  self.registerMX2Tables = registerMX2Tables;
  self.SQL_TOKENS = SQL_TOKENS;
  self.SQL_PHI = PHI;
  self.SQL_PHI_INV = PHI_INV;
}
