/* ============================================================
   XCFE TRANSFORM PIPELINE
   XJSON → AST → Transform → Optimized Output
   Law: Ω-BLACK-PANEL

   XCFE = eXtensible Compression Format Engine
   Implements pattern matching, AST transforms, and optimization
   ============================================================ */

/* ============================================================
   XJSON TOKENIZER
   Converts XJSON source text into token stream
   ============================================================ */

const TokenType = {
  // Literals
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',

  // Structural
  LBRACE: 'LBRACE',       // {
  RBRACE: 'RBRACE',       // }
  LBRACKET: 'LBRACKET',   // [
  RBRACKET: 'RBRACKET',   // ]
  COLON: 'COLON',         // :
  COMMA: 'COMMA',         // ,

  // XJSON Extensions
  AT_TYPE: 'AT_TYPE',     // @type
  AT_ID: 'AT_ID',         // @id
  AT_LAW: 'AT_LAW',       // @law
  AT_CONTEXT: 'AT_CONTEXT', // @context
  AT_BLOCK: 'AT_BLOCK',   // @block
  AT_FLOW: 'AT_FLOW',     // @flow
  AT_DATA: 'AT_DATA',     // @data
  AT_EXEC: 'AT_EXEC',     // @exec
  AT_WEIGHTS: 'AT_WEIGHTS', // @weights
  AT_IN: 'AT_IN',         // @in
  AT_OUT: 'AT_OUT',       // @out
  AT_DIRECTIVE: 'AT_DIRECTIVE', // Generic @directive

  // Glyphs
  GLYPH: 'GLYPH',         // Unicode glyph operators

  // Comments
  COMMENT: 'COMMENT',     // // or /* */

  // Identifiers
  IDENTIFIER: 'IDENTIFIER',

  // End
  EOF: 'EOF'
};

class XJSONTokenizer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  peek(offset = 0) {
    return this.source[this.pos + offset];
  }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  isAtEnd() {
    return this.pos >= this.source.length;
  }

  isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  isAlpha(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  isAlphaNumeric(ch) {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  }

  isGlyph(ch) {
    // Check for Unicode glyphs (emoji, symbols, etc.)
    if (!ch) return false;
    const code = ch.codePointAt(0);
    return code > 0x1F00 || // Extended symbols
           (code >= 0x2190 && code <= 0x27FF) || // Arrows, math symbols
           (code >= 0x1F300 && code <= 0x1F9FF); // Emoji
  }

  makeToken(type, value = null) {
    return {
      type,
      value,
      line: this.line,
      column: this.column - (value ? String(value).length : 0)
    };
  }

  skipWhitespace() {
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  skipComment() {
    if (this.peek() === '/' && this.peek(1) === '/') {
      // Single-line comment
      while (!this.isAtEnd() && this.peek() !== '\n') {
        this.advance();
      }
      return true;
    }
    if (this.peek() === '/' && this.peek(1) === '*') {
      // Multi-line comment
      this.advance(); // /
      this.advance(); // *
      while (!this.isAtEnd()) {
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

  readString() {
    const quote = this.advance(); // " or '
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          case 'u':
            // Unicode escape
            let hex = '';
            for (let i = 0; i < 4; i++) {
              hex += this.advance();
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          default:
            value += escaped;
        }
      } else {
        value += this.advance();
      }
    }

    if (!this.isAtEnd()) {
      this.advance(); // Closing quote
    }

    return this.makeToken(TokenType.STRING, value);
  }

  readNumber() {
    let value = '';
    const startColumn = this.column;

    // Handle negative numbers
    if (this.peek() === '-') {
      value += this.advance();
    }

    // Integer part
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      value += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Exponent part
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return this.makeToken(TokenType.NUMBER, parseFloat(value));
  }

  readIdentifierOrKeyword() {
    let value = '';
    const startColumn = this.column;

    // Handle @ directives
    if (this.peek() === '@') {
      value += this.advance();
    }

    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-')) {
      value += this.advance();
    }

    // Check for XJSON @ directives
    const directiveMap = {
      '@type': TokenType.AT_TYPE,
      '@id': TokenType.AT_ID,
      '@law': TokenType.AT_LAW,
      '@context': TokenType.AT_CONTEXT,
      '@block': TokenType.AT_BLOCK,
      '@flow': TokenType.AT_FLOW,
      '@data': TokenType.AT_DATA,
      '@exec': TokenType.AT_EXEC,
      '@weights': TokenType.AT_WEIGHTS,
      '@in': TokenType.AT_IN,
      '@out': TokenType.AT_OUT
    };

    if (directiveMap[value]) {
      return this.makeToken(directiveMap[value], value);
    }

    if (value.startsWith('@')) {
      return this.makeToken(TokenType.AT_DIRECTIVE, value);
    }

    // Check for keywords
    if (value === 'true') return this.makeToken(TokenType.BOOLEAN, true);
    if (value === 'false') return this.makeToken(TokenType.BOOLEAN, false);
    if (value === 'null') return this.makeToken(TokenType.NULL, null);

    return this.makeToken(TokenType.IDENTIFIER, value);
  }

  readGlyph() {
    let value = '';

    // Read full glyph (may be multi-codepoint)
    while (!this.isAtEnd() && this.isGlyph(this.peek())) {
      value += this.advance();
    }

    return this.makeToken(TokenType.GLYPH, value);
  }

  tokenize() {
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;

      // Skip comments
      if (this.skipComment()) continue;

      const ch = this.peek();

      // Single-character tokens
      switch (ch) {
        case '{': this.advance(); this.tokens.push(this.makeToken(TokenType.LBRACE, '{')); continue;
        case '}': this.advance(); this.tokens.push(this.makeToken(TokenType.RBRACE, '}')); continue;
        case '[': this.advance(); this.tokens.push(this.makeToken(TokenType.LBRACKET, '[')); continue;
        case ']': this.advance(); this.tokens.push(this.makeToken(TokenType.RBRACKET, ']')); continue;
        case ':': this.advance(); this.tokens.push(this.makeToken(TokenType.COLON, ':')); continue;
        case ',': this.advance(); this.tokens.push(this.makeToken(TokenType.COMMA, ',')); continue;
      }

      // Strings
      if (ch === '"' || ch === "'") {
        this.tokens.push(this.readString());
        continue;
      }

      // Numbers
      if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Identifiers and keywords
      if (this.isAlpha(ch) || ch === '@') {
        this.tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      // Glyphs
      if (this.isGlyph(ch)) {
        this.tokens.push(this.readGlyph());
        continue;
      }

      // Unknown character - skip
      this.advance();
    }

    this.tokens.push(this.makeToken(TokenType.EOF));
    return this.tokens;
  }
}

/* ============================================================
   XJSON AST NODES
   Abstract Syntax Tree representation
   ============================================================ */

const ASTNodeType = {
  OBJECT: 'Object',
  ARRAY: 'Array',
  PROPERTY: 'Property',
  STRING: 'String',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  NULL: 'Null',
  GLYPH: 'Glyph',
  BLOCK: 'Block',
  DIRECTIVE: 'Directive',
  REFERENCE: 'Reference'
};

class ASTNode {
  constructor(type, value = null, children = [], meta = {}) {
    this.type = type;
    this.value = value;
    this.children = children;
    this.meta = meta;
    this.parent = null;
  }

  addChild(node) {
    node.parent = this;
    this.children.push(node);
    return this;
  }

  clone() {
    const cloned = new ASTNode(this.type, this.value, [], { ...this.meta });
    for (const child of this.children) {
      cloned.addChild(child.clone());
    }
    return cloned;
  }

  toJSON() {
    if (this.type === ASTNodeType.OBJECT) {
      const obj = {};
      for (const child of this.children) {
        if (child.type === ASTNodeType.PROPERTY) {
          obj[child.value] = child.children[0]?.toJSON();
        }
      }
      return obj;
    }
    if (this.type === ASTNodeType.ARRAY) {
      return this.children.map(c => c.toJSON());
    }
    if (this.type === ASTNodeType.PROPERTY) {
      return { [this.value]: this.children[0]?.toJSON() };
    }
    return this.value;
  }
}

/* ============================================================
   XJSON PARSER
   Parses token stream into AST
   ============================================================ */

class XJSONParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.tokens.length ? this.tokens[idx] : this.tokens[this.tokens.length - 1];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  check(type) {
    return this.peek().type === type;
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) {
      return this.advance();
    }
    this.error(message);
    return null;
  }

  error(message) {
    const token = this.peek();
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      token: token.value
    });
  }

  parse() {
    try {
      const ast = this.parseValue();
      return { ast, errors: this.errors };
    } catch (e) {
      this.errors.push({ message: e.message, line: 0, column: 0 });
      return { ast: null, errors: this.errors };
    }
  }

  parseValue() {
    const token = this.peek();

    switch (token.type) {
      case TokenType.LBRACE:
        return this.parseObject();
      case TokenType.LBRACKET:
        return this.parseArray();
      case TokenType.STRING:
        this.advance();
        return new ASTNode(ASTNodeType.STRING, token.value);
      case TokenType.NUMBER:
        this.advance();
        return new ASTNode(ASTNodeType.NUMBER, token.value);
      case TokenType.BOOLEAN:
        this.advance();
        return new ASTNode(ASTNodeType.BOOLEAN, token.value);
      case TokenType.NULL:
        this.advance();
        return new ASTNode(ASTNodeType.NULL, null);
      case TokenType.GLYPH:
        this.advance();
        return new ASTNode(ASTNodeType.GLYPH, token.value);
      case TokenType.IDENTIFIER:
        this.advance();
        return new ASTNode(ASTNodeType.REFERENCE, token.value);
      default:
        this.error(`Unexpected token: ${token.type}`);
        this.advance();
        return new ASTNode(ASTNodeType.NULL, null);
    }
  }

  parseObject() {
    this.consume(TokenType.LBRACE, 'Expected {');

    const node = new ASTNode(ASTNodeType.OBJECT);
    const directives = {};

    while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
      const property = this.parseProperty();
      if (property) {
        // Check for XJSON directives
        if (property.value.startsWith('@')) {
          directives[property.value] = property.children[0]?.value;
        }
        node.addChild(property);
      }

      if (!this.check(TokenType.RBRACE)) {
        this.match(TokenType.COMMA);
      }
    }

    this.consume(TokenType.RBRACE, 'Expected }');

    // Mark as Block if it has @block directive
    if (directives['@block']) {
      node.type = ASTNodeType.BLOCK;
      node.meta.blockId = directives['@block'];
      node.meta.blockType = directives['@type'];
    }

    node.meta.directives = directives;
    return node;
  }

  parseArray() {
    this.consume(TokenType.LBRACKET, 'Expected [');

    const node = new ASTNode(ASTNodeType.ARRAY);

    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      node.addChild(this.parseValue());

      if (!this.check(TokenType.RBRACKET)) {
        this.match(TokenType.COMMA);
      }
    }

    this.consume(TokenType.RBRACKET, 'Expected ]');
    return node;
  }

  parseProperty() {
    // Property key can be string, identifier, or @ directive
    let key;
    const token = this.peek();

    if (token.type === TokenType.STRING) {
      key = this.advance().value;
    } else if (token.type === TokenType.IDENTIFIER) {
      key = this.advance().value;
    } else if (token.type.startsWith('AT_')) {
      key = this.advance().value;
    } else {
      this.error(`Expected property key, got ${token.type}`);
      return null;
    }

    this.consume(TokenType.COLON, 'Expected :');

    const value = this.parseValue();
    const property = new ASTNode(ASTNodeType.PROPERTY, key);
    property.addChild(value);

    return property;
  }
}

/* ============================================================
   PATTERN MATCHING ENGINE
   Matches AST patterns for transforms
   ============================================================ */

class Pattern {
  constructor(spec) {
    this.spec = spec;
    this.captures = {};
  }

  match(node) {
    this.captures = {};
    return this._match(this.spec, node);
  }

  _match(pattern, node) {
    if (!pattern || !node) return false;

    // Wildcard - matches anything
    if (pattern === '*') {
      return true;
    }

    // Capture pattern - $name matches and captures
    if (typeof pattern === 'string' && pattern.startsWith('$')) {
      const captureName = pattern.slice(1);
      this.captures[captureName] = node;
      return true;
    }

    // Type pattern
    if (pattern.type && pattern.type !== node.type) {
      return false;
    }

    // Value pattern
    if (pattern.value !== undefined) {
      if (pattern.value instanceof RegExp) {
        if (!pattern.value.test(String(node.value))) return false;
      } else if (pattern.value !== node.value) {
        return false;
      }
    }

    // Children pattern
    if (pattern.children) {
      if (!Array.isArray(pattern.children)) {
        // Object pattern for children by key
        for (const [key, childPattern] of Object.entries(pattern.children)) {
          if (key.startsWith('$')) {
            // Capture child by name
            const prop = node.children.find(c => c.type === ASTNodeType.PROPERTY && c.value === key.slice(1));
            if (!prop) return false;
            this.captures[key.slice(1)] = prop.children[0];
          } else {
            const prop = node.children.find(c => c.type === ASTNodeType.PROPERTY && c.value === key);
            if (!prop || !this._match(childPattern, prop.children[0])) return false;
          }
        }
      } else {
        // Array pattern
        if (node.children.length < pattern.children.length) return false;
        for (let i = 0; i < pattern.children.length; i++) {
          if (!this._match(pattern.children[i], node.children[i])) return false;
        }
      }
    }

    // Meta pattern
    if (pattern.meta) {
      for (const [key, value] of Object.entries(pattern.meta)) {
        if (node.meta[key] !== value) return false;
      }
    }

    return true;
  }

  getCaptures() {
    return this.captures;
  }
}

/* ============================================================
   TRANSFORM RULES
   Define AST transformations
   ============================================================ */

class TransformRule {
  constructor(name, pattern, transform, options = {}) {
    this.name = name;
    this.pattern = new Pattern(pattern);
    this.transform = transform;
    this.priority = options.priority || 0;
    this.recursive = options.recursive !== false;
  }

  apply(node) {
    if (this.pattern.match(node)) {
      const captures = this.pattern.getCaptures();
      return this.transform(node, captures);
    }
    return null;
  }
}

/* ============================================================
   XCFE TRANSFORM ENGINE
   Core transformation pipeline
   ============================================================ */

class XCFETransform {
  constructor() {
    this.rules = [];
    this.optimizations = [];
    this.metrics = {
      transforms_applied: 0,
      nodes_visited: 0,
      optimizations_applied: 0
    };
  }

  addRule(rule) {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
    return this;
  }

  addRules(rules) {
    for (const rule of rules) {
      this.addRule(rule);
    }
    return this;
  }

  addOptimization(name, fn, priority = 0) {
    this.optimizations.push({ name, fn, priority });
    this.optimizations.sort((a, b) => b.priority - a.priority);
    return this;
  }

  transform(ast) {
    this.metrics = { transforms_applied: 0, nodes_visited: 0, optimizations_applied: 0 };
    return this._transformNode(ast);
  }

  _transformNode(node) {
    if (!node) return node;

    this.metrics.nodes_visited++;

    // Try each rule
    for (const rule of this.rules) {
      const result = rule.apply(node);
      if (result !== null) {
        this.metrics.transforms_applied++;

        // If recursive, continue transforming the result
        if (rule.recursive) {
          return this._transformNode(result);
        }
        return result;
      }
    }

    // Transform children
    if (node.children && node.children.length > 0) {
      const newChildren = [];
      for (const child of node.children) {
        newChildren.push(this._transformNode(child));
      }
      node.children = newChildren;
    }

    return node;
  }

  optimize(ast) {
    let result = ast;

    for (const opt of this.optimizations) {
      const before = JSON.stringify(result.toJSON());
      result = opt.fn(result);
      const after = JSON.stringify(result.toJSON());

      if (before !== after) {
        this.metrics.optimizations_applied++;
      }
    }

    return result;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

/* ============================================================
   BUILT-IN TRANSFORMS
   Common XCFE transformations
   ============================================================ */

const BuiltInTransforms = {
  // Constant folding - evaluate constant expressions
  constantFolding: new TransformRule(
    'constant_folding',
    {
      type: ASTNodeType.OBJECT,
      children: {
        '@exec': { type: ASTNodeType.STRING, value: /^(add|sub|mul|div)$/ }
      }
    },
    (node, captures) => {
      const exec = captures['@exec']?.value;
      const args = node.children.find(c => c.value === 'args')?.children[0];

      if (!args || args.type !== ASTNodeType.ARRAY) return null;

      const nums = args.children.filter(c => c.type === ASTNodeType.NUMBER);
      if (nums.length !== args.children.length) return null;

      let result;
      const values = nums.map(n => n.value);

      switch (exec) {
        case 'add': result = values.reduce((a, b) => a + b, 0); break;
        case 'sub': result = values.reduce((a, b) => a - b); break;
        case 'mul': result = values.reduce((a, b) => a * b, 1); break;
        case 'div': result = values.reduce((a, b) => a / b); break;
        default: return null;
      }

      return new ASTNode(ASTNodeType.NUMBER, result);
    },
    { priority: 100 }
  ),

  // Dead code elimination - remove unreachable blocks
  deadCodeElimination: (ast) => {
    const eliminateEmpty = (node) => {
      if (!node || !node.children) return node;

      node.children = node.children.filter(child => {
        // Remove empty objects
        if (child.type === ASTNodeType.OBJECT && child.children.length === 0) {
          return false;
        }
        // Remove empty arrays
        if (child.type === ASTNodeType.ARRAY && child.children.length === 0) {
          return false;
        }
        // Remove null properties
        if (child.type === ASTNodeType.PROPERTY &&
            child.children[0]?.type === ASTNodeType.NULL) {
          return false;
        }
        return true;
      });

      node.children.forEach(eliminateEmpty);
      return node;
    };

    return eliminateEmpty(ast.clone());
  },

  // Inline expansion - expand references
  inlineExpansion: new TransformRule(
    'inline_expansion',
    {
      type: ASTNodeType.REFERENCE
    },
    (node, captures) => {
      // Would need a symbol table to resolve references
      // For now, just return the node unchanged
      return null;
    },
    { priority: 50 }
  ),

  // Glyph compression - convert operations to glyphs
  glyphCompression: new TransformRule(
    'glyph_compression',
    {
      type: ASTNodeType.OBJECT,
      children: {
        '@exec': { type: ASTNodeType.STRING }
      }
    },
    (node, captures) => {
      const glyphMap = {
        'add': '➕',
        'sub': '➖',
        'mul': '✖',
        'div': '➗',
        'eq': '⚖',
        'lt': '⊂',
        'gt': '⊃',
        'and': '∧',
        'or': '∨',
        'not': '¬',
        'wave': '🌊',
        'pi': 'π',
        'phi': 'φ'
      };

      const execProp = node.children.find(c => c.value === '@exec');
      if (!execProp) return null;

      const execValue = execProp.children[0]?.value;
      const glyph = glyphMap[execValue];

      if (glyph) {
        execProp.children[0].value = glyph;
        execProp.children[0].type = ASTNodeType.GLYPH;
      }

      return node;
    },
    { priority: 75 }
  )
};

/* ============================================================
   TRANSFORM COMPOSITION
   Combine multiple transforms
   ============================================================ */

function xcfeCompose(...transforms) {
  return (ast) => {
    let result = ast;
    for (const transform of transforms) {
      if (typeof transform === 'function') {
        result = transform(result);
      } else if (transform instanceof XCFETransform) {
        result = transform.transform(result);
      }
    }
    return result;
  };
}

/* ============================================================
   HIGH-LEVEL API
   ============================================================ */

/**
 * Tokenize XJSON source
 */
function xjsonTokenize(source) {
  const tokenizer = new XJSONTokenizer(source);
  return tokenizer.tokenize();
}

/**
 * Parse XJSON to AST
 */
function xjsonParse(source) {
  const tokens = xjsonTokenize(source);
  const parser = new XJSONParser(tokens);
  return parser.parse();
}

/**
 * Transform AST with rules
 */
function xcfeTransform(ast, rules = []) {
  const engine = new XCFETransform();
  engine.addRules(rules);
  return {
    ast: engine.transform(ast),
    metrics: engine.getMetrics()
  };
}

/**
 * Optimize AST
 */
function xcfeOptimize(ast, options = {}) {
  const engine = new XCFETransform();

  // Add built-in optimizations
  if (options.constantFolding !== false) {
    engine.addRule(BuiltInTransforms.constantFolding);
  }
  if (options.glyphCompression !== false) {
    engine.addRule(BuiltInTransforms.glyphCompression);
  }
  if (options.deadCodeElimination !== false) {
    engine.addOptimization('dead_code', BuiltInTransforms.deadCodeElimination, 50);
  }

  // Transform first
  let result = engine.transform(ast);

  // Then optimize
  result = engine.optimize(result);

  return {
    ast: result,
    metrics: engine.getMetrics()
  };
}

/**
 * Full pipeline: source → tokens → AST → transform → optimize → output
 */
function xcfePipeline(source, options = {}) {
  const startTime = performance.now();

  // Step 1: Tokenize
  const tokens = xjsonTokenize(source);

  // Step 2: Parse
  const { ast, errors } = xjsonParse(source);

  if (errors.length > 0 && !options.ignoreErrors) {
    return {
      success: false,
      errors,
      timing: { total: performance.now() - startTime }
    };
  }

  // Step 3: Transform with custom rules
  let transformed = ast;
  let transformMetrics = {};

  if (options.rules && options.rules.length > 0) {
    const result = xcfeTransform(ast, options.rules);
    transformed = result.ast;
    transformMetrics = result.metrics;
  }

  // Step 4: Optimize
  let optimized = transformed;
  let optimizeMetrics = {};

  if (options.optimize !== false) {
    const result = xcfeOptimize(transformed, options);
    optimized = result.ast;
    optimizeMetrics = result.metrics;
  }

  const totalTime = performance.now() - startTime;

  return {
    success: true,
    tokens: options.includeTokens ? tokens : undefined,
    ast: optimized,
    json: optimized.toJSON(),
    errors,
    metrics: {
      ...transformMetrics,
      ...optimizeMetrics,
      token_count: tokens.length,
      parse_errors: errors.length
    },
    timing: { total: totalTime }
  };
}

/* ============================================================
   EXPORTS
   ============================================================ */

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.TokenType = TokenType;
  self.ASTNodeType = ASTNodeType;
  self.ASTNode = ASTNode;
  self.XJSONTokenizer = XJSONTokenizer;
  self.XJSONParser = XJSONParser;
  self.Pattern = Pattern;
  self.TransformRule = TransformRule;
  self.XCFETransform = XCFETransform;
  self.BuiltInTransforms = BuiltInTransforms;

  // High-level API
  self.xjsonTokenize = xjsonTokenize;
  self.xjsonParse = xjsonParse;
  self.xcfeTransform = xcfeTransform;
  self.xcfeOptimize = xcfeOptimize;
  self.xcfeCompose = xcfeCompose;
  self.xcfePipeline = xcfePipeline;
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TokenType,
    ASTNodeType,
    ASTNode,
    XJSONTokenizer,
    XJSONParser,
    Pattern,
    TransformRule,
    XCFETransform,
    BuiltInTransforms,
    xjsonTokenize,
    xjsonParse,
    xcfeTransform,
    xcfeOptimize,
    xcfeCompose,
    xcfePipeline
  };
}
