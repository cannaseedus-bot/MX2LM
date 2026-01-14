/**
 * MX2LM IndexedDB Storage Adapter
 *
 * K'UHUL-integrated IndexedDB layer for high-performance tensor storage,
 * RLHF data management, and event streams with compression-first principles.
 *
 * Database: KUHUL_DB
 * Object Stores:
 *   - tensors   : Compressed tensor storage (ModelSafe format)
 *   - rlhf      : RLHF training data (prompts, scores, responses)
 *   - events    : Time-series event streams (delta-encoded)
 *   - vocabs    : Vocabulary/tokenizer storage
 *   - weights   : N-gram weight tables
 *   - traces    : Execution traces for replay
 *   - deltas    : Weight deltas for RLHF
 *   - cache     : Response cache
 *
 * @version 1.0.0
 * @law Ω-BLACK-PANEL
 */

'use strict';

// ============================================================================
// Constants
// ============================================================================

const IDB_NAME = 'KUHUL_DB';
const IDB_VERSION = 1;

// π-KUHUL constants
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INV = PHI - 1;

// Compression methods
const COMPRESSION_METHODS = {
  NONE: 'none',
  SCXQ2: 'scxq2',
  QUANTIZATION: 'quantization',
  DELTA: 'delta',
  SPARSE: 'sparse'
};

// Data types
const DTYPES = {
  FLOAT32: 'float32',
  FLOAT16: 'float16',
  INT32: 'int32',
  INT16: 'int16',
  INT8: 'int8',
  UINT8: 'uint8',
  BOOL: 'bool',
  STRING: 'string'
};

// ============================================================================
// IDB Schema Initialization
// ============================================================================

/**
 * Initialize the KUHUL_DB with all required object stores
 * @returns {Promise<IDBDatabase>}
 */
function initKUHULDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onerror = (event) => {
      reject(new KUHULIDBError('Failed to open database', 'INIT', event.target.error));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Tensors store (compressed model weights, embeddings)
      if (!db.objectStoreNames.contains('tensors')) {
        const tensorStore = db.createObjectStore('tensors', { keyPath: 'name' });
        tensorStore.createIndex('shape', 'shape', { unique: false, multiEntry: true });
        tensorStore.createIndex('dtype', 'dtype', { unique: false });
        tensorStore.createIndex('compression_method', 'compression.method', { unique: false });
        tensorStore.createIndex('created_at', 'metadata.created_at', { unique: false });
      }

      // RLHF data store
      if (!db.objectStoreNames.contains('rlhf')) {
        const rlhfStore = db.createObjectStore('rlhf', { keyPath: 'id', autoIncrement: true });
        rlhfStore.createIndex('prompt_id', 'prompt_id', { unique: false });
        rlhfStore.createIndex('score', 'score', { unique: false });
        rlhfStore.createIndex('timestamp', 'timestamp', { unique: false });
        rlhfStore.createIndex('reward', 'reward', { unique: false });
      }

      // Events store (time-series with delta encoding)
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        eventStore.createIndex('type', 'type', { unique: false });
        eventStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventStore.createIndex('type_timestamp', ['type', 'timestamp'], { unique: false });
      }

      // Vocabularies store
      if (!db.objectStoreNames.contains('vocabs')) {
        const vocabStore = db.createObjectStore('vocabs', { keyPath: 'name' });
        vocabStore.createIndex('size', 'size', { unique: false });
      }

      // Weights store (n-gram weights)
      if (!db.objectStoreNames.contains('weights')) {
        const weightsStore = db.createObjectStore('weights', { keyPath: 'id', autoIncrement: true });
        weightsStore.createIndex('sequence', 'sequence', { unique: false });
        weightsStore.createIndex('weight', 'weight', { unique: false });
        weightsStore.createIndex('epoch', 'epoch', { unique: false });
      }

      // Traces store (execution traces for replay)
      if (!db.objectStoreNames.contains('traces')) {
        const tracesStore = db.createObjectStore('traces', { keyPath: 'id' });
        tracesStore.createIndex('tick', 'tick', { unique: false });
        tracesStore.createIndex('operation', 'operation', { unique: false });
        tracesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Deltas store (weight deltas for RLHF)
      if (!db.objectStoreNames.contains('deltas')) {
        const deltasStore = db.createObjectStore('deltas', { keyPath: 'id', autoIncrement: true });
        deltasStore.createIndex('epoch', 'epoch', { unique: false });
        deltasStore.createIndex('applied', 'applied', { unique: false });
        deltasStore.createIndex('base_hash', 'base_hash', { unique: false });
      }

      // Cache store (response cache)
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
        cacheStore.createIndex('expires_at', 'expires_at', { unique: false });
        cacheStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Brains store (brain topology definitions)
      if (!db.objectStoreNames.contains('brains')) {
        const brainsStore = db.createObjectStore('brains', { keyPath: 'id' });
        brainsStore.createIndex('name', 'name', { unique: false });
        brainsStore.createIndex('type', 'type', { unique: false });
      }

      // Agents store (micro-agent registry)
      if (!db.objectStoreNames.contains('agents')) {
        const agentsStore = db.createObjectStore('agents', { keyPath: 'id' });
        agentsStore.createIndex('name', 'name', { unique: false });
        agentsStore.createIndex('generation', 'generation', { unique: false });
        agentsStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// ============================================================================
// Error Handling
// ============================================================================

class KUHULIDBError extends Error {
  constructor(message, operation, details = null) {
    super(message);
    this.name = 'KUHULIDBError';
    this.operation = operation;
    this.details = details;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// ============================================================================
// Compression Utilities
// ============================================================================

/**
 * SCXQ2 compression for arbitrary data
 */
function compressSCXQ2(data, params = {}) {
  const dictSize = params.dictSize || 2048;
  const blockSize = params.blockSize || 64;

  // Build frequency dictionary
  const tokens = typeof data === 'string' ? data.split('') :
                 Array.isArray(data) ? data.map(String) : [String(data)];

  const freq = new Map();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  // Sort by frequency
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, dictSize);

  // Create dictionary
  const dict = new Map();
  sorted.forEach((entry, i) => dict.set(entry[0], i));

  // Encode tokens
  const encoded = [];
  for (const token of tokens) {
    if (dict.has(token)) {
      encoded.push(dict.get(token));
    } else {
      // Escape for out-of-vocabulary
      encoded.push(dictSize);
      encoded.push(...new TextEncoder().encode(token));
      encoded.push(0); // null terminator
    }
  }

  // Pack to varint
  const packed = packVarint(encoded);

  return {
    compressed: packed,
    dictionary: sorted.map(e => e[0]),
    originalSize: tokens.length,
    compressedSize: packed.length,
    ratio: packed.length / Math.max(tokens.length, 1)
  };
}

/**
 * SCXQ2 decompression
 */
function decompressSCXQ2(compressed, dictionary) {
  const encoded = unpackVarint(compressed);
  const dictSize = dictionary.length;
  const tokens = [];

  let i = 0;
  while (i < encoded.length) {
    const code = encoded[i++];
    if (code < dictSize) {
      tokens.push(dictionary[code]);
    } else if (code === dictSize) {
      // Out-of-vocabulary escape
      const bytes = [];
      while (i < encoded.length && encoded[i] !== 0) {
        bytes.push(encoded[i++]);
      }
      i++; // skip null terminator
      tokens.push(new TextDecoder().decode(new Uint8Array(bytes)));
    }
  }

  return tokens;
}

/**
 * Quantize float array to specified bit depth
 */
function quantize(data, bits = 8) {
  if (!(data instanceof Float32Array)) {
    data = new Float32Array(data);
  }

  const scale = Math.pow(2, bits) - 1;

  // Find min/max for normalization
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }

  const range = max - min || 1;
  const quantized = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - min) / range;
    quantized[i] = Math.round(normalized * scale);
  }

  return {
    quantized,
    min,
    max,
    bits,
    originalLength: data.length
  };
}

/**
 * Dequantize back to float
 */
function dequantize(quantized, min, max, bits = 8) {
  const scale = Math.pow(2, bits) - 1;
  const range = max - min;
  const result = new Float32Array(quantized.length);

  for (let i = 0; i < quantized.length; i++) {
    const normalized = quantized[i] / scale;
    result[i] = normalized * range + min;
  }

  return result;
}

/**
 * Delta encoding for time-series data
 */
function deltaEncode(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { encoded: [], baseline: 0 };
  }

  const baseline = data[0];
  const encoded = [0]; // First delta is always 0

  for (let i = 1; i < data.length; i++) {
    encoded.push(data[i] - data[i - 1]);
  }

  return { encoded, baseline };
}

/**
 * Delta decoding
 */
function deltaDecode(encoded, baseline) {
  const result = [baseline];
  let current = baseline;

  for (let i = 1; i < encoded.length; i++) {
    current += encoded[i];
    result.push(current);
  }

  return result;
}

/**
 * Sparse encoding for mostly-zero data
 */
function sparseEncode(data, threshold = 0) {
  const nonZero = [];

  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > threshold) {
      nonZero.push({ index: i, value: data[i] });
    }
  }

  return {
    nonZero,
    length: data.length,
    density: nonZero.length / data.length
  };
}

/**
 * Sparse decoding
 */
function sparseDecode(sparse) {
  const result = new Float32Array(sparse.length);

  for (const { index, value } of sparse.nonZero) {
    result[index] = value;
  }

  return result;
}

/**
 * Varint packing
 */
function packVarint(numbers) {
  const bytes = [];

  for (const num of numbers) {
    let n = num >>> 0; // Convert to unsigned
    while (n >= 0x80) {
      bytes.push((n & 0x7F) | 0x80);
      n >>>= 7;
    }
    bytes.push(n);
  }

  return new Uint8Array(bytes);
}

/**
 * Varint unpacking
 */
function unpackVarint(bytes) {
  const numbers = [];
  let i = 0;

  while (i < bytes.length) {
    let num = 0;
    let shift = 0;

    while (i < bytes.length) {
      const byte = bytes[i++];
      num |= (byte & 0x7F) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }

    numbers.push(num);
  }

  return numbers;
}

// ============================================================================
// KUHUL IDB Adapter
// ============================================================================

class KUHULIDBAdapter {
  constructor(db) {
    this.db = db;
    this.stats = {
      tensorsStored: 0,
      tensorsLoaded: 0,
      rlhfRecords: 0,
      eventsStored: 0,
      compressionRatio: 0
    };
  }

  // ========== Tensor Operations ==========

  /**
   * Store a tensor with compression
   * @param {string} name - Tensor name
   * @param {object} tensor - Tensor object { shape, dtype, data, compression }
   */
  async storeTensor(name, tensor) {
    const tx = this.db.transaction('tensors', 'readwrite');
    const store = tx.objectStore('tensors');

    let compressedData;
    let compressionMeta = tensor.compression || { method: COMPRESSION_METHODS.NONE };

    switch (compressionMeta.method) {
      case COMPRESSION_METHODS.SCXQ2:
        const scxq2Result = compressSCXQ2(tensor.data, compressionMeta.params);
        compressedData = scxq2Result.compressed;
        compressionMeta.dictionary = scxq2Result.dictionary;
        compressionMeta.originalSize = scxq2Result.originalSize;
        compressionMeta.compressedSize = scxq2Result.compressedSize;
        compressionMeta.ratio = scxq2Result.ratio;
        break;

      case COMPRESSION_METHODS.QUANTIZATION:
        const bits = compressionMeta.params?.bits || 8;
        const quantResult = quantize(tensor.data, bits);
        compressedData = quantResult.quantized;
        compressionMeta.min = quantResult.min;
        compressionMeta.max = quantResult.max;
        compressionMeta.bits = bits;
        compressionMeta.originalLength = quantResult.originalLength;
        break;

      case COMPRESSION_METHODS.SPARSE:
        const threshold = compressionMeta.params?.threshold || 0;
        const sparseResult = sparseEncode(tensor.data, threshold);
        compressedData = sparseResult;
        compressionMeta.density = sparseResult.density;
        break;

      default:
        // No compression - store as-is
        compressedData = tensor.data;
    }

    const record = {
      name,
      shape: tensor.shape,
      dtype: tensor.dtype || DTYPES.FLOAT32,
      data: compressedData,
      compression: compressionMeta,
      metadata: {
        created_at: Date.now(),
        updated_at: Date.now(),
        ...tensor.metadata
      }
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => {
        this.stats.tensorsStored++;
        resolve({ success: true, name, compression: compressionMeta });
      };
      request.onerror = () => reject(new KUHULIDBError('Failed to store tensor', 'STORE_TENSOR', request.error));
    });
  }

  /**
   * Load a tensor with automatic decompression
   * @param {string} name - Tensor name
   */
  async loadTensor(name) {
    const tx = this.db.transaction('tensors', 'readonly');
    const store = tx.objectStore('tensors');

    return new Promise((resolve, reject) => {
      const request = store.get(name);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        let decompressedData;
        const compression = record.compression;

        switch (compression.method) {
          case COMPRESSION_METHODS.SCXQ2:
            decompressedData = decompressSCXQ2(record.data, compression.dictionary);
            break;

          case COMPRESSION_METHODS.QUANTIZATION:
            decompressedData = dequantize(record.data, compression.min, compression.max, compression.bits);
            break;

          case COMPRESSION_METHODS.SPARSE:
            decompressedData = sparseDecode(record.data);
            break;

          default:
            decompressedData = record.data;
        }

        this.stats.tensorsLoaded++;
        resolve({
          name: record.name,
          shape: record.shape,
          dtype: record.dtype,
          data: decompressedData,
          compression: compression,
          metadata: record.metadata
        });
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to load tensor', 'LOAD_TENSOR', request.error));
    });
  }

  /**
   * Query tensors by shape or dtype
   */
  async queryTensors(where = {}) {
    const tx = this.db.transaction('tensors', 'readonly');
    const store = tx.objectStore('tensors');

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result;

        // Apply filters
        if (where.dtype) {
          results = results.filter(t => t.dtype === where.dtype);
        }
        if (where.shape) {
          results = results.filter(t =>
            JSON.stringify(t.shape) === JSON.stringify(where.shape)
          );
        }
        if (where.compression) {
          results = results.filter(t => t.compression.method === where.compression);
        }

        // Return metadata only (not full data)
        resolve(results.map(t => ({
          name: t.name,
          shape: t.shape,
          dtype: t.dtype,
          compression: t.compression,
          metadata: t.metadata
        })));
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to query tensors', 'QUERY_TENSORS', request.error));
    });
  }

  /**
   * Delete a tensor
   */
  async deleteTensor(name) {
    const tx = this.db.transaction('tensors', 'readwrite');
    const store = tx.objectStore('tensors');

    return new Promise((resolve, reject) => {
      const request = store.delete(name);
      request.onsuccess = () => resolve({ success: true, name });
      request.onerror = () => reject(new KUHULIDBError('Failed to delete tensor', 'DELETE_TENSOR', request.error));
    });
  }

  // ========== RLHF Operations ==========

  /**
   * Store RLHF training data
   */
  async storeRLHF(data) {
    const tx = this.db.transaction('rlhf', 'readwrite');
    const store = tx.objectStore('rlhf');

    const records = Array.isArray(data) ? data : [data];
    const results = [];

    for (const record of records) {
      const rlhfRecord = {
        prompt_id: record.prompt_id,
        prompt: record.prompt,
        response: record.response,
        score: record.score,
        reward: record.reward || record.score,
        timestamp: record.timestamp || Date.now(),
        metadata: record.metadata || {}
      };

      await new Promise((resolve, reject) => {
        const request = store.add(rlhfRecord);
        request.onsuccess = () => {
          results.push({ id: request.result, ...rlhfRecord });
          resolve();
        };
        request.onerror = () => reject(new KUHULIDBError('Failed to store RLHF data', 'STORE_RLHF', request.error));
      });
    }

    this.stats.rlhfRecords += results.length;
    return { success: true, count: results.length, records: results };
  }

  /**
   * Query RLHF data with conditions
   */
  async queryRLHF(where = {}, options = {}) {
    const tx = this.db.transaction('rlhf', 'readonly');
    const store = tx.objectStore('rlhf');

    return new Promise((resolve, reject) => {
      let request;

      // Use index if available
      if (where.score !== undefined && typeof where.score === 'object') {
        const index = store.index('score');
        const range = this.buildKeyRange(where.score);
        request = index.getAll(range);
      } else if (where.prompt_id !== undefined) {
        const index = store.index('prompt_id');
        request = index.getAll(where.prompt_id);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result;

        // Apply additional filters
        results = this.applyFilters(results, where);

        // Apply ordering
        if (options.orderBy) {
          const [field, direction] = options.orderBy.split(' ');
          results.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return direction?.toUpperCase() === 'DESC' ? -cmp : cmp;
          });
        }

        // Apply limit/offset
        if (options.offset) {
          results = results.slice(options.offset);
        }
        if (options.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to query RLHF', 'QUERY_RLHF', request.error));
    });
  }

  /**
   * Aggregate RLHF data
   */
  async aggregateRLHF(groupBy, aggregates) {
    const data = await this.queryRLHF();
    const groups = new Map();

    for (const record of data) {
      const key = record[groupBy];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(record);
    }

    const results = [];
    for (const [key, groupData] of groups) {
      const result = { [groupBy]: key };

      for (const [aggName, aggDef] of Object.entries(aggregates)) {
        const { func, field } = aggDef;
        const values = groupData.map(r => r[field]).filter(v => v != null);

        switch (func.toUpperCase()) {
          case 'COUNT':
            result[aggName] = values.length;
            break;
          case 'SUM':
            result[aggName] = values.reduce((a, b) => a + b, 0);
            break;
          case 'AVG':
          case 'MEAN':
            result[aggName] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'MIN':
            result[aggName] = Math.min(...values);
            break;
          case 'MAX':
            result[aggName] = Math.max(...values);
            break;
        }
      }

      results.push(result);
    }

    return results;
  }

  // ========== Event Operations ==========

  /**
   * Store events with delta encoding
   */
  async storeEvents(type, events) {
    const tx = this.db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');

    // Sort by timestamp
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Apply delta encoding to timestamps
    const timestamps = sorted.map(e => e.timestamp);
    const { encoded: deltaTimestamps, baseline } = deltaEncode(timestamps);

    const results = [];
    for (let i = 0; i < sorted.length; i++) {
      const eventRecord = {
        type,
        timestamp: sorted[i].timestamp,
        delta_timestamp: deltaTimestamps[i],
        payload: sorted[i].payload,
        compression: sorted[i].compression || COMPRESSION_METHODS.NONE
      };

      if (i === 0) {
        eventRecord.baseline = baseline;
      }

      await new Promise((resolve, reject) => {
        const request = store.add(eventRecord);
        request.onsuccess = () => {
          results.push({ id: request.result, ...eventRecord });
          resolve();
        };
        request.onerror = () => reject(new KUHULIDBError('Failed to store event', 'STORE_EVENT', request.error));
      });
    }

    this.stats.eventsStored += results.length;
    return { success: true, count: results.length, events: results };
  }

  /**
   * Query events by type and time range
   */
  async queryEvents(type, timeRange = null, options = {}) {
    const tx = this.db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const index = store.index('type_timestamp');

    return new Promise((resolve, reject) => {
      let range;
      if (timeRange) {
        range = IDBKeyRange.bound(
          [type, timeRange[0]],
          [type, timeRange[1]]
        );
      } else {
        range = IDBKeyRange.bound([type, 0], [type, Infinity]);
      }

      const request = index.getAll(range);

      request.onsuccess = () => {
        let results = request.result;

        // Apply limit
        if (options.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to query events', 'QUERY_EVENTS', request.error));
    });
  }

  // ========== Vocabulary Operations ==========

  /**
   * Store vocabulary with compression
   */
  async storeVocabulary(name, vocab, compression = COMPRESSION_METHODS.SCXQ2) {
    const tx = this.db.transaction('vocabs', 'readwrite');
    const store = tx.objectStore('vocabs');

    let compressedVocab;
    let compressionMeta = { method: compression };

    if (compression === COMPRESSION_METHODS.SCXQ2) {
      const result = compressSCXQ2(vocab, { dictSize: Math.min(vocab.length, 4096) });
      compressedVocab = result.compressed;
      compressionMeta.dictionary = result.dictionary;
      compressionMeta.ratio = result.ratio;
    } else {
      compressedVocab = vocab;
    }

    const record = {
      name,
      vocab: compressedVocab,
      size: vocab.length,
      compression: compressionMeta,
      created_at: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve({ success: true, name, size: vocab.length });
      request.onerror = () => reject(new KUHULIDBError('Failed to store vocabulary', 'STORE_VOCAB', request.error));
    });
  }

  /**
   * Load vocabulary with decompression
   */
  async loadVocabulary(name) {
    const tx = this.db.transaction('vocabs', 'readonly');
    const store = tx.objectStore('vocabs');

    return new Promise((resolve, reject) => {
      const request = store.get(name);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        let vocab;
        if (record.compression.method === COMPRESSION_METHODS.SCXQ2) {
          vocab = decompressSCXQ2(record.vocab, record.compression.dictionary);
        } else {
          vocab = record.vocab;
        }

        resolve({
          name: record.name,
          vocab,
          size: record.size,
          compression: record.compression
        });
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to load vocabulary', 'LOAD_VOCAB', request.error));
    });
  }

  // ========== Weight Operations ==========

  /**
   * Store n-gram weights
   */
  async storeWeights(weights, epoch = 0) {
    const tx = this.db.transaction('weights', 'readwrite');
    const store = tx.objectStore('weights');

    const records = Array.isArray(weights) ? weights : [weights];
    let stored = 0;

    for (const weight of records) {
      await new Promise((resolve, reject) => {
        const request = store.add({
          sequence: weight.sequence,
          weight: weight.weight,
          count: weight.count || 1,
          epoch,
          timestamp: Date.now()
        });
        request.onsuccess = () => { stored++; resolve(); };
        request.onerror = () => reject(new KUHULIDBError('Failed to store weight', 'STORE_WEIGHT', request.error));
      });
    }

    return { success: true, stored };
  }

  /**
   * Load weights by epoch
   */
  async loadWeights(epoch = null) {
    const tx = this.db.transaction('weights', 'readonly');
    const store = tx.objectStore('weights');

    return new Promise((resolve, reject) => {
      let request;
      if (epoch !== null) {
        const index = store.index('epoch');
        request = index.getAll(epoch);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new KUHULIDBError('Failed to load weights', 'LOAD_WEIGHTS', request.error));
    });
  }

  // ========== Trace Operations ==========

  /**
   * Store execution trace
   */
  async storeTrace(trace) {
    const tx = this.db.transaction('traces', 'readwrite');
    const store = tx.objectStore('traces');

    const traceRecord = {
      id: trace.id || `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tick: trace.tick,
      operation: trace.operation,
      input_hash: trace.input_hash,
      output_hash: trace.output_hash,
      duration_ms: trace.duration_ms,
      timestamp: trace.timestamp || Date.now(),
      metadata: trace.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const request = store.put(traceRecord);
      request.onsuccess = () => resolve({ success: true, id: traceRecord.id });
      request.onerror = () => reject(new KUHULIDBError('Failed to store trace', 'STORE_TRACE', request.error));
    });
  }

  /**
   * Query traces
   */
  async queryTraces(where = {}, options = {}) {
    const tx = this.db.transaction('traces', 'readonly');
    const store = tx.objectStore('traces');

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        let results = this.applyFilters(request.result, where);

        // Apply ordering
        if (options.orderBy) {
          const [field, direction] = options.orderBy.split(' ');
          results.sort((a, b) => {
            const cmp = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
            return direction?.toUpperCase() === 'DESC' ? -cmp : cmp;
          });
        }

        if (options.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to query traces', 'QUERY_TRACES', request.error));
    });
  }

  // ========== Delta Operations ==========

  /**
   * Store weight delta
   */
  async storeDelta(delta) {
    const tx = this.db.transaction('deltas', 'readwrite');
    const store = tx.objectStore('deltas');

    const deltaRecord = {
      epoch: delta.epoch,
      base_hash: delta.base_hash,
      delta_hash: delta.delta_hash,
      changes: delta.changes,
      applied: false,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(deltaRecord);
      request.onsuccess = () => resolve({ success: true, id: request.result });
      request.onerror = () => reject(new KUHULIDBError('Failed to store delta', 'STORE_DELTA', request.error));
    });
  }

  /**
   * Get pending deltas
   */
  async getPendingDeltas() {
    const tx = this.db.transaction('deltas', 'readonly');
    const store = tx.objectStore('deltas');
    const index = store.index('applied');

    return new Promise((resolve, reject) => {
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new KUHULIDBError('Failed to get pending deltas', 'GET_PENDING_DELTAS', request.error));
    });
  }

  /**
   * Mark delta as applied
   */
  async applyDelta(id) {
    const tx = this.db.transaction('deltas', 'readwrite');
    const store = tx.objectStore('deltas');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const delta = getRequest.result;
        if (!delta) {
          reject(new KUHULIDBError('Delta not found', 'APPLY_DELTA', { id }));
          return;
        }

        delta.applied = true;
        delta.applied_at = Date.now();

        const putRequest = store.put(delta);
        putRequest.onsuccess = () => resolve({ success: true, id });
        putRequest.onerror = () => reject(new KUHULIDBError('Failed to apply delta', 'APPLY_DELTA', putRequest.error));
      };

      getRequest.onerror = () => reject(new KUHULIDBError('Failed to get delta', 'APPLY_DELTA', getRequest.error));
    });
  }

  // ========== Cache Operations ==========

  /**
   * Store in cache
   */
  async cacheSet(key, value, ttlMs = 3600000) {
    const tx = this.db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');

    const record = {
      key,
      value,
      created_at: Date.now(),
      expires_at: Date.now() + ttlMs
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve({ success: true, key });
      request.onerror = () => reject(new KUHULIDBError('Failed to cache', 'CACHE_SET', request.error));
    });
  }

  /**
   * Get from cache
   */
  async cacheGet(key) {
    const tx = this.db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        if (!record || record.expires_at < Date.now()) {
          resolve(null);
          return;
        }
        resolve(record.value);
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to get cache', 'CACHE_GET', request.error));
    });
  }

  /**
   * Clear expired cache entries
   */
  async cachePrune() {
    const tx = this.db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('expires_at');
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve({ success: true, deleted });
        }
      };

      request.onerror = () => reject(new KUHULIDBError('Failed to prune cache', 'CACHE_PRUNE', request.error));
    });
  }

  // ========== Utility Methods ==========

  /**
   * Build IDBKeyRange from condition object
   */
  buildKeyRange(condition) {
    if (condition.$gt !== undefined) {
      return IDBKeyRange.lowerBound(condition.$gt, true);
    }
    if (condition.$gte !== undefined) {
      return IDBKeyRange.lowerBound(condition.$gte, false);
    }
    if (condition.$lt !== undefined) {
      return IDBKeyRange.upperBound(condition.$lt, true);
    }
    if (condition.$lte !== undefined) {
      return IDBKeyRange.upperBound(condition.$lte, false);
    }
    if (condition.$between !== undefined) {
      return IDBKeyRange.bound(condition.$between[0], condition.$between[1]);
    }
    return null;
  }

  /**
   * Apply filters to results
   */
  applyFilters(results, where) {
    return results.filter(record => {
      for (const [field, condition] of Object.entries(where)) {
        const value = record[field];

        if (typeof condition === 'object') {
          if (condition.$gt !== undefined && !(value > condition.$gt)) return false;
          if (condition.$gte !== undefined && !(value >= condition.$gte)) return false;
          if (condition.$lt !== undefined && !(value < condition.$lt)) return false;
          if (condition.$lte !== undefined && !(value <= condition.$lte)) return false;
          if (condition.$in !== undefined && !condition.$in.includes(value)) return false;
          if (condition.$nin !== undefined && condition.$nin.includes(value)) return false;
          if (condition.$between !== undefined) {
            if (!(value >= condition.$between[0] && value <= condition.$between[1])) return false;
          }
        } else {
          if (value !== condition) return false;
        }
      }
      return true;
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats = {
      ...this.stats,
      stores: {}
    };

    const storeNames = ['tensors', 'rlhf', 'events', 'vocabs', 'weights', 'traces', 'deltas', 'cache'];

    for (const storeName of storeNames) {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const count = await new Promise((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });
        stats.stores[storeName] = { count };
      } catch (e) {
        stats.stores[storeName] = { count: 0, error: e.message };
      }
    }

    return stats;
  }

  /**
   * Clear all data
   */
  async clearAll() {
    const storeNames = ['tensors', 'rlhf', 'events', 'vocabs', 'weights', 'traces', 'deltas', 'cache'];

    for (const storeName of storeNames) {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    return { success: true, cleared: storeNames };
  }
}

// ============================================================================
// KQL Glyph Operations (Extensions for K'UHUL)
// ============================================================================

/**
 * Execute KQL storage operation
 * @param {string} glyph - Operation glyph (⟁STORE⟁, ⟁LOAD⟁, etc.)
 * @param {object} params - Operation parameters
 * @param {KUHULIDBAdapter} adapter - IDB adapter instance
 */
async function executeKQLStorage(glyph, params, adapter) {
  switch (glyph) {
    case '⟁STORE⟁':
      if (params.tensor) {
        return adapter.storeTensor(params.name, params.tensor);
      }
      if (params.rlhf) {
        return adapter.storeRLHF(params.rlhf);
      }
      if (params.events) {
        return adapter.storeEvents(params.type, params.events);
      }
      if (params.vocab) {
        return adapter.storeVocabulary(params.name, params.vocab);
      }
      if (params.weights) {
        return adapter.storeWeights(params.weights, params.epoch);
      }
      throw new KUHULIDBError('Invalid STORE parameters', '⟁STORE⟁', params);

    case '⟁LOAD⟁':
      if (params.tensor) {
        return adapter.loadTensor(params.name);
      }
      if (params.rlhf) {
        return adapter.queryRLHF(params.where, params.options);
      }
      if (params.events) {
        return adapter.queryEvents(params.type, params.timeRange, params.options);
      }
      if (params.vocab) {
        return adapter.loadVocabulary(params.name);
      }
      if (params.weights) {
        return adapter.loadWeights(params.epoch);
      }
      throw new KUHULIDBError('Invalid LOAD parameters', '⟁LOAD⟁', params);

    case '⟁COMPRESS⟁':
      switch (params.method) {
        case 'scxq2':
          return compressSCXQ2(params.data, params.params);
        case 'quantization':
          return quantize(params.data, params.params?.bits);
        case 'delta':
          return deltaEncode(params.data);
        case 'sparse':
          return sparseEncode(params.data, params.params?.threshold);
        default:
          throw new KUHULIDBError('Unknown compression method', '⟁COMPRESS⟁', params);
      }

    case '⟁DECOMPRESS⟁':
      switch (params.method) {
        case 'scxq2':
          return decompressSCXQ2(params.data, params.dictionary);
        case 'quantization':
          return dequantize(params.data, params.min, params.max, params.bits);
        case 'delta':
          return deltaDecode(params.data, params.baseline);
        case 'sparse':
          return sparseDecode(params.data);
        default:
          throw new KUHULIDBError('Unknown compression method', '⟁DECOMPRESS⟁', params);
      }

    default:
      throw new KUHULIDBError('Unknown glyph operation', glyph, params);
  }
}

// ============================================================================
// High-Level API
// ============================================================================

let _dbInstance = null;
let _adapterInstance = null;

/**
 * Get or initialize the IDB adapter
 */
async function getIDBAdapter() {
  if (_adapterInstance) {
    return _adapterInstance;
  }

  _dbInstance = await initKUHULDB();
  _adapterInstance = new KUHULIDBAdapter(_dbInstance);
  return _adapterInstance;
}

/**
 * Execute IDB operation
 */
async function idbExecute(operation, params) {
  const adapter = await getIDBAdapter();
  return executeKQLStorage(operation, params, adapter);
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initKUHULDB,
    KUHULIDBAdapter,
    KUHULIDBError,
    executeKQLStorage,
    getIDBAdapter,
    idbExecute,
    // Compression utilities
    compressSCXQ2,
    decompressSCXQ2,
    quantize,
    dequantize,
    deltaEncode,
    deltaDecode,
    sparseEncode,
    sparseDecode,
    packVarint,
    unpackVarint,
    // Constants
    COMPRESSION_METHODS,
    DTYPES,
    IDB_NAME,
    IDB_VERSION
  };
}

if (typeof self !== 'undefined') {
  self.initKUHULDB = initKUHULDB;
  self.KUHULIDBAdapter = KUHULIDBAdapter;
  self.KUHULIDBError = KUHULIDBError;
  self.executeKQLStorage = executeKQLStorage;
  self.getIDBAdapter = getIDBAdapter;
  self.idbExecute = idbExecute;
  self.compressSCXQ2 = compressSCXQ2;
  self.decompressSCXQ2 = decompressSCXQ2;
  self.quantize = quantize;
  self.dequantize = dequantize;
  self.deltaEncode = deltaEncode;
  self.deltaDecode = deltaDecode;
  self.sparseEncode = sparseEncode;
  self.sparseDecode = sparseDecode;
  self.COMPRESSION_METHODS = COMPRESSION_METHODS;
  self.DTYPES = DTYPES;
}
