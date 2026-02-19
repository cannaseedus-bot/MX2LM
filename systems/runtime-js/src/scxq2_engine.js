/* ============================================================
   SCXQ2 COMPRESSION ENGINE
   K'UHUL Script & Glyph Compression
   Law: Ω-BLACK-PANEL

   SCXQ2 = Structured Compression with eXtensible Quantization v2
   Implements svgParse, dictBuild, scxqPack/Unpack
   ============================================================ */

/* ============================================================
   SVG NODE & TREE STRUCTURES
   ============================================================ */

class SVGNode {
  constructor(tag, attrs = {}, children = []) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
    this.parent = null;
  }

  addChild(node) {
    node.parent = this;
    this.children.push(node);
    return this;
  }

  clone() {
    const cloned = new SVGNode(this.tag, { ...this.attrs }, []);
    for (const child of this.children) {
      cloned.addChild(child.clone());
    }
    return cloned;
  }

  toJSON() {
    return {
      tag: this.tag,
      attrs: this.attrs,
      children: this.children.map(c => c.toJSON())
    };
  }

  static fromJSON(json) {
    const node = new SVGNode(json.tag, json.attrs || {});
    for (const child of json.children || []) {
      node.addChild(SVGNode.fromJSON(child));
    }
    return node;
  }
}

class SVGTree {
  constructor(root = null) {
    this.root = root || new SVGNode('root');
  }

  toJSON() {
    return this.root.toJSON();
  }

  static fromJSON(json) {
    return new SVGTree(SVGNode.fromJSON(json));
  }
}

/* ============================================================
   K'UHUL TOKENIZER FOR COMPRESSION
   ============================================================ */

function tokenizeKUHUL(input) {
  const tokens = [];
  let i = 0;

  // K'UHUL glyph patterns
  const glyphPatterns = [
    /^⟁\w+⟁/u,           // ⟁Wo⟁, ⟁Sek⟁, etc.
    /^[⟁⊕⊗→⤈⨁⨂🛑🔄➕➖✖➗⚖⊂⊃∧∨¬π φτ🌊]/u,  // Single glyphs
    /^⚡\w+/u,             // ⚡10, ⚡π, etc.
  ];

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Try glyph patterns
    let matched = false;
    for (const pattern of glyphPatterns) {
      const match = input.slice(i).match(pattern);
      if (match) {
        tokens.push({ type: 'glyph', value: match[0] });
        i += match[0].length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Numbers
    const numMatch = input.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
    if (numMatch) {
      tokens.push({ type: 'number', value: parseFloat(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }

    // Strings (quoted)
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      let str = '';
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\') {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Identifiers
    const idMatch = input.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (idMatch) {
      tokens.push({ type: 'identifier', value: idMatch[0] });
      i += idMatch[0].length;
      continue;
    }

    // Operators and punctuation
    if ('=(),{}[]@#:;'.includes(input[i])) {
      tokens.push({ type: 'punct', value: input[i] });
      i++;
      continue;
    }

    // Unknown - skip
    i++;
  }

  return tokens;
}

/* ============================================================
   SVG PARSE — Parse K'UHUL to SVGTree
   ============================================================ */

function svgParse(input) {
  const tokens = tokenizeKUHUL(input);
  const root = new SVGNode('root');
  let current = root;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // Assignment: ⟁Wo⟁ x = value or ⊕ value ⊗ x
    if (token.type === 'glyph' && token.value === '⟁Wo⟁') {
      const varName = tokens[i + 1]?.value;
      const value = tokens[i + 3]?.value;
      current.addChild(new SVGNode('assign', { var: varName, value }));
      i += 4;
      continue;
    }

    // K'UHUL opcodes
    if (token.type === 'glyph') {
      const opcodeMap = {
        '⊕': 'load',
        '⊗': 'store',
        '→': 'jump',
        '⤈': 'branch',
        '⨁': 'call',
        '⨂': 'return',
        '🛑': 'halt',
        '🔄': 'halt',
        '➕': 'add',
        '➖': 'sub',
        '✖': 'mul',
        '➗': 'div',
        '⚖': 'eq',
        '⊂': 'lt',
        '⊃': 'gt',
        '∧': 'and',
        '∨': 'or',
        '¬': 'not',
        '🌊': 'wave',
        'π': 'pi',
        'φ': 'phi'
      };

      const opcode = opcodeMap[token.value] || token.value;
      const operand = tokens[i + 1]?.value;

      const node = new SVGNode('op', { opcode });
      if (operand !== undefined && tokens[i + 1]?.type !== 'glyph') {
        node.attrs.operand = operand;
        i++;
      }
      current.addChild(node);
      i++;
      continue;
    }

    // Numbers and literals
    if (token.type === 'number') {
      current.addChild(new SVGNode('literal', { type: 'number', value: token.value }));
      i++;
      continue;
    }

    if (token.type === 'string') {
      current.addChild(new SVGNode('literal', { type: 'string', value: token.value }));
      i++;
      continue;
    }

    if (token.type === 'identifier') {
      current.addChild(new SVGNode('ref', { name: token.value }));
      i++;
      continue;
    }

    // Block start
    if (token.type === 'punct' && token.value === '{') {
      const block = new SVGNode('block');
      current.addChild(block);
      current = block;
      i++;
      continue;
    }

    // Block end
    if (token.type === 'punct' && token.value === '}') {
      if (current.parent) {
        current = current.parent;
      }
      i++;
      continue;
    }

    // Label: @name
    if (token.type === 'punct' && token.value === '@') {
      const labelName = tokens[i + 1]?.value;
      current.addChild(new SVGNode('label', { name: labelName }));
      i += 2;
      continue;
    }

    // Skip unknown
    i++;
  }

  return new SVGTree(root);
}

/* ============================================================
   DICT BUILD — Build Symbol Dictionary
   ============================================================ */

function dictBuild(svgTree, options = {}) {
  const frequency = new Map();
  const minFrequency = options.minFrequency || 1;

  // Traverse tree and count symbols
  function traverse(node) {
    // Count tag
    frequency.set(node.tag, (frequency.get(node.tag) || 0) + 1);

    // Count attribute keys and values
    for (const [key, value] of Object.entries(node.attrs)) {
      frequency.set(key, (frequency.get(key) || 0) + 1);
      if (typeof value === 'string') {
        frequency.set(value, (frequency.get(value) || 0) + 1);
      }
    }

    // Traverse children
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(svgTree.root);

  // Build dictionary sorted by frequency (most frequent first)
  const sorted = Array.from(frequency.entries())
    .filter(([, freq]) => freq >= minFrequency)
    .sort((a, b) => b[1] - a[1]);

  const dict = {};
  let index = 0;

  for (const [symbol, freq] of sorted) {
    dict[symbol] = {
      index,
      frequency: freq,
      encoded: encodeIndex(index)
    };
    index++;
  }

  return dict;
}

// Encode index as variable-length code
function encodeIndex(index) {
  if (index < 128) {
    return [index];
  }
  // VLQ encoding for larger indices
  const bytes = [];
  while (index > 0) {
    let byte = index & 0x7F;
    index >>= 7;
    if (index > 0) byte |= 0x80;
    bytes.push(byte);
  }
  return bytes;
}

function decodeIndex(bytes, offset = 0) {
  let index = 0;
  let shift = 0;
  let pos = offset;

  while (pos < bytes.length) {
    const byte = bytes[pos];
    index |= (byte & 0x7F) << shift;
    pos++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return { index, bytesRead: pos - offset };
}

/* ============================================================
   SCXQ PACK — Pack to Compressed Binary
   ============================================================ */

function scxqPack(svgTree, symbolDict) {
  const binary = [];

  // Header: magic + version
  binary.push(0x53, 0x43, 0x58, 0x51); // "SCXQ"
  binary.push(0x02, 0x00); // Version 2.0

  // Dictionary section
  const dictEntries = Object.entries(symbolDict).sort((a, b) => a[1].index - b[1].index);
  const dictSize = dictEntries.length;

  // Write dict size as varint
  pushVarint(binary, dictSize);

  // Write dictionary entries
  for (const [symbol] of dictEntries) {
    const encoded = new TextEncoder().encode(symbol);
    pushVarint(binary, encoded.length);
    for (const byte of encoded) {
      binary.push(byte);
    }
  }

  // Tree section
  const treeBytes = [];
  serializeNode(svgTree.root, symbolDict, treeBytes);

  // Write tree size
  pushVarint(binary, treeBytes.length);

  // Write tree data
  for (const byte of treeBytes) {
    binary.push(byte);
  }

  return {
    binary: new Uint8Array(binary),
    size: binary.length,
    dictSize,
    treeSize: treeBytes.length,
    compressionRatio: binary.length / JSON.stringify(svgTree.toJSON()).length
  };
}

function pushVarint(arr, value) {
  while (value >= 0x80) {
    arr.push((value & 0x7F) | 0x80);
    value >>= 7;
  }
  arr.push(value);
}

function readVarint(bytes, offset) {
  let value = 0;
  let shift = 0;
  let pos = offset;

  while (pos < bytes.length) {
    const byte = bytes[pos];
    value |= (byte & 0x7F) << shift;
    pos++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return { value, bytesRead: pos - offset };
}

function serializeNode(node, dict, bytes) {
  // Node type marker
  const tagIdx = dict[node.tag]?.index ?? 0xFFFF;
  pushVarint(bytes, tagIdx);

  // Attributes count
  const attrEntries = Object.entries(node.attrs);
  pushVarint(bytes, attrEntries.length);

  // Serialize attributes
  for (const [key, value] of attrEntries) {
    const keyIdx = dict[key]?.index ?? 0xFFFF;
    pushVarint(bytes, keyIdx);

    // Value type and value
    if (typeof value === 'number') {
      bytes.push(0x01); // Number type
      const view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0, value, true);
      for (let i = 0; i < 8; i++) {
        bytes.push(view.getUint8(i));
      }
    } else if (typeof value === 'string') {
      const strIdx = dict[value]?.index;
      if (strIdx !== undefined) {
        bytes.push(0x02); // Dict reference
        pushVarint(bytes, strIdx);
      } else {
        bytes.push(0x03); // Inline string
        const encoded = new TextEncoder().encode(value);
        pushVarint(bytes, encoded.length);
        for (const byte of encoded) {
          bytes.push(byte);
        }
      }
    } else if (typeof value === 'boolean') {
      bytes.push(value ? 0x04 : 0x05);
    } else {
      bytes.push(0x00); // Null
    }
  }

  // Children count
  pushVarint(bytes, node.children.length);

  // Serialize children
  for (const child of node.children) {
    serializeNode(child, dict, bytes);
  }
}

/* ============================================================
   SCXQ UNPACK — Unpack from Compressed Binary
   ============================================================ */

function scxqUnpack(compressed) {
  const bytes = compressed instanceof Uint8Array ? compressed : new Uint8Array(compressed);
  let offset = 0;

  // Verify magic
  if (bytes[0] !== 0x53 || bytes[1] !== 0x43 || bytes[2] !== 0x58 || bytes[3] !== 0x51) {
    throw new Error('Invalid SCXQ magic');
  }
  offset = 4;

  // Read version
  const version = bytes[offset] + (bytes[offset + 1] << 8);
  offset += 2;

  // Read dictionary
  const { value: dictSize, bytesRead: br1 } = readVarint(bytes, offset);
  offset += br1;

  const reverseDict = [];
  for (let i = 0; i < dictSize; i++) {
    const { value: strLen, bytesRead: br2 } = readVarint(bytes, offset);
    offset += br2;

    const strBytes = bytes.slice(offset, offset + strLen);
    const symbol = new TextDecoder().decode(strBytes);
    reverseDict.push(symbol);
    offset += strLen;
  }

  // Read tree size
  const { value: treeSize, bytesRead: br3 } = readVarint(bytes, offset);
  offset += br3;

  // Deserialize tree
  const { node: root, bytesRead: br4 } = deserializeNode(bytes, offset, reverseDict);

  return new SVGTree(root);
}

function deserializeNode(bytes, offset, reverseDict) {
  const startOffset = offset;

  // Read tag index
  const { value: tagIdx, bytesRead: br1 } = readVarint(bytes, offset);
  offset += br1;

  const tag = tagIdx < reverseDict.length ? reverseDict[tagIdx] : 'unknown';
  const node = new SVGNode(tag);

  // Read attributes count
  const { value: attrCount, bytesRead: br2 } = readVarint(bytes, offset);
  offset += br2;

  // Read attributes
  for (let i = 0; i < attrCount; i++) {
    const { value: keyIdx, bytesRead: br3 } = readVarint(bytes, offset);
    offset += br3;

    const key = keyIdx < reverseDict.length ? reverseDict[keyIdx] : `attr_${keyIdx}`;

    // Read value type
    const valueType = bytes[offset++];

    let value;
    if (valueType === 0x01) {
      // Number
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
      value = view.getFloat64(0, true);
      offset += 8;
    } else if (valueType === 0x02) {
      // Dict reference
      const { value: strIdx, bytesRead: br4 } = readVarint(bytes, offset);
      offset += br4;
      value = strIdx < reverseDict.length ? reverseDict[strIdx] : `ref_${strIdx}`;
    } else if (valueType === 0x03) {
      // Inline string
      const { value: strLen, bytesRead: br5 } = readVarint(bytes, offset);
      offset += br5;
      const strBytes = bytes.slice(offset, offset + strLen);
      value = new TextDecoder().decode(strBytes);
      offset += strLen;
    } else if (valueType === 0x04) {
      value = true;
    } else if (valueType === 0x05) {
      value = false;
    } else {
      value = null;
    }

    node.attrs[key] = value;
  }

  // Read children count
  const { value: childCount, bytesRead: br6 } = readVarint(bytes, offset);
  offset += br6;

  // Read children
  for (let i = 0; i < childCount; i++) {
    const { node: child, bytesRead: br7 } = deserializeNode(bytes, offset, reverseDict);
    node.addChild(child);
    offset += br7;
  }

  return { node, bytesRead: offset - startOffset };
}

/* ============================================================
   HIGH-LEVEL API
   ============================================================ */

/**
 * Compress K'UHUL script or data
 */
function scxq2Compress(input, options = {}) {
  const startTime = performance.now();

  // Parse to tree
  let tree;
  if (typeof input === 'string') {
    tree = svgParse(input);
  } else if (input instanceof SVGTree) {
    tree = input;
  } else {
    // Assume JSON-like object, convert to tree
    tree = new SVGTree(objectToNode(input));
  }

  // Build dictionary
  const dict = dictBuild(tree, options);

  // Pack to binary
  const packed = scxqPack(tree, dict);

  const totalTime = performance.now() - startTime;

  return {
    compressed: Array.from(packed.binary),
    size: packed.size,
    originalSize: typeof input === 'string' ? input.length : JSON.stringify(input).length,
    compressionRatio: packed.compressionRatio,
    dictSize: packed.dictSize,
    timing: totalTime,
    dict: options.includeDict ? dict : undefined
  };
}

/**
 * Decompress to original structure
 */
function scxq2Decompress(compressed) {
  const bytes = compressed instanceof Uint8Array
    ? compressed
    : new Uint8Array(compressed.compressed || compressed);

  const tree = scxqUnpack(bytes);
  return tree.toJSON();
}

/**
 * Build dictionary only (for analysis)
 */
function scxq2BuildDict(input) {
  let tree;
  if (typeof input === 'string') {
    tree = svgParse(input);
  } else if (input instanceof SVGTree) {
    tree = input;
  } else {
    tree = new SVGTree(objectToNode(input));
  }

  return dictBuild(tree);
}

/**
 * Convert plain object to SVGNode tree
 */
function objectToNode(obj, tag = 'root') {
  if (obj === null || obj === undefined) {
    return new SVGNode('null');
  }

  if (typeof obj !== 'object') {
    return new SVGNode('literal', { type: typeof obj, value: obj });
  }

  if (Array.isArray(obj)) {
    const node = new SVGNode('array', { length: obj.length });
    for (let i = 0; i < obj.length; i++) {
      node.addChild(objectToNode(obj[i], `item_${i}`));
    }
    return node;
  }

  const node = new SVGNode(tag);
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      node.addChild(objectToNode(value, key));
    } else {
      node.attrs[key] = value;
    }
  }
  return node;
}

/**
 * Calculate compression statistics
 */
function scxq2Stats(input) {
  const tree = typeof input === 'string' ? svgParse(input) : input;
  const dict = dictBuild(tree);
  const packed = scxqPack(tree, dict);

  const originalSize = typeof input === 'string' ? input.length : JSON.stringify(input).length;

  return {
    originalSize,
    compressedSize: packed.size,
    compressionRatio: packed.compressionRatio,
    dictEntries: Object.keys(dict).length,
    treeNodes: countNodes(tree.root),
    symbolFrequencies: Object.fromEntries(
      Object.entries(dict)
        .sort((a, b) => b[1].frequency - a[1].frequency)
        .slice(0, 20)
        .map(([symbol, info]) => [symbol, info.frequency])
    )
  };
}

function countNodes(node) {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

/* ============================================================
   EXPORTS
   ============================================================ */

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.SVGNode = SVGNode;
  self.SVGTree = SVGTree;
  self.svgParse = svgParse;
  self.dictBuild = dictBuild;
  self.scxqPack = scxqPack;
  self.scxqUnpack = scxqUnpack;
  self.scxq2Compress = scxq2Compress;
  self.scxq2Decompress = scxq2Decompress;
  self.scxq2BuildDict = scxq2BuildDict;
  self.scxq2Stats = scxq2Stats;
  self.tokenizeKUHUL = tokenizeKUHUL;
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SVGNode,
    SVGTree,
    svgParse,
    dictBuild,
    scxqPack,
    scxqUnpack,
    scxq2Compress,
    scxq2Decompress,
    scxq2BuildDict,
    scxq2Stats,
    tokenizeKUHUL
  };
}
