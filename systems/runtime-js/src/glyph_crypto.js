/* ============================================================
   WEB CRYPTO ENCRYPTION FOR GLYPHS
   π-KUHUL Military-Grade Security Layer
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * GlyphCrypto - AES-GCM encryption for glyph data
 * Uses Web Crypto API for military-grade security
 */
class GlyphCrypto {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'AES-GCM';
    this.keyLength = options.keyLength || 256;
    this.ivLength = options.ivLength || 12;
    this.tagLength = options.tagLength || 128;

    // Key derivation parameters
    this.pbkdf2Iterations = options.pbkdf2Iterations || 100000;
    this.saltLength = options.saltLength || 16;

    // Cached keys
    this.keyCache = new Map();

    // Check for Web Crypto support
    this.supported = typeof crypto !== 'undefined' &&
                     crypto.subtle &&
                     typeof crypto.subtle.encrypt === 'function';
  }

  // ==================== KEY GENERATION ====================

  /**
   * Generate a random encryption key
   */
  async generateKey() {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const key = await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    return key;
  }

  /**
   * Generate random bytes
   */
  generateRandomBytes(length) {
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for non-secure contexts
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return bytes;
  }

  /**
   * Derive key from password using PBKDF2
   */
  async deriveKey(password, salt = null) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    // Generate salt if not provided
    if (!salt) {
      salt = this.generateRandomBytes(this.saltLength);
    } else if (typeof salt === 'string') {
      salt = this.hexToBytes(salt);
    }

    // Import password as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the actual encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.pbkdf2Iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    return { key, salt };
  }

  /**
   * Import key from raw bytes or hex string
   */
  async importKey(keyData) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    let keyBytes;
    if (typeof keyData === 'string') {
      keyBytes = this.hexToBytes(keyData);
    } else {
      keyBytes = keyData;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  }

  /**
   * Export key to hex string
   */
  async exportKey(key) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const exported = await crypto.subtle.exportKey('raw', key);
    return this.bytesToHex(new Uint8Array(exported));
  }

  // ==================== ENCRYPTION ====================

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(data, key, additionalData = null) {
    if (!this.supported) {
      return this.fallbackEncrypt(data);
    }

    // Handle string input
    let plaintext;
    if (typeof data === 'string') {
      plaintext = new TextEncoder().encode(data);
    } else if (typeof data === 'object') {
      plaintext = new TextEncoder().encode(JSON.stringify(data));
    } else {
      plaintext = data;
    }

    // Generate IV
    const iv = this.generateRandomBytes(this.ivLength);

    // Build algorithm parameters
    const algorithmParams = {
      name: this.algorithm,
      iv: iv,
      tagLength: this.tagLength
    };

    // Add additional authenticated data if provided
    if (additionalData) {
      algorithmParams.additionalData = new TextEncoder().encode(
        typeof additionalData === 'string' ? additionalData : JSON.stringify(additionalData)
      );
    }

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      algorithmParams,
      key,
      plaintext
    );

    return {
      ciphertext: this.bytesToHex(new Uint8Array(ciphertext)),
      iv: this.bytesToHex(iv),
      algorithm: this.algorithm,
      tagLength: this.tagLength
    };
  }

  /**
   * Encrypt with password (derives key internally)
   */
  async encryptWithPassword(data, password) {
    const { key, salt } = await this.deriveKey(password);
    const encrypted = await this.encrypt(data, key);
    encrypted.salt = this.bytesToHex(salt);
    return encrypted;
  }

  // ==================== DECRYPTION ====================

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(encryptedData, key, additionalData = null) {
    if (!this.supported) {
      return this.fallbackDecrypt(encryptedData);
    }

    // Parse encrypted data
    const ciphertext = this.hexToBytes(encryptedData.ciphertext);
    const iv = this.hexToBytes(encryptedData.iv);

    // Build algorithm parameters
    const algorithmParams = {
      name: this.algorithm,
      iv: iv,
      tagLength: encryptedData.tagLength || this.tagLength
    };

    // Add additional authenticated data if provided
    if (additionalData) {
      algorithmParams.additionalData = new TextEncoder().encode(
        typeof additionalData === 'string' ? additionalData : JSON.stringify(additionalData)
      );
    }

    try {
      const plaintext = await crypto.subtle.decrypt(
        algorithmParams,
        key,
        ciphertext
      );

      return new TextDecoder().decode(plaintext);
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt with password
   */
  async decryptWithPassword(encryptedData, password) {
    const salt = this.hexToBytes(encryptedData.salt);
    const { key } = await this.deriveKey(password, salt);
    return this.decrypt(encryptedData, key);
  }

  // ==================== GLYPH-SPECIFIC ====================

  /**
   * Encrypt a glyph with its metadata
   */
  async encryptGlyph(glyph, data, key) {
    const payload = {
      glyph,
      data,
      timestamp: Date.now(),
      version: '1.0'
    };

    // Use glyph as additional authenticated data
    const encrypted = await this.encrypt(payload, key, glyph);
    encrypted.glyph = glyph;

    return encrypted;
  }

  /**
   * Decrypt a glyph
   */
  async decryptGlyph(encryptedGlyph, key) {
    const plaintext = await this.decrypt(encryptedGlyph, key, encryptedGlyph.glyph);
    return JSON.parse(plaintext);
  }

  /**
   * Encrypt glyph stack for P2P transmission
   */
  async encryptGlyphStack(glyphs, key) {
    const stack = {
      glyphs,
      count: glyphs.length,
      timestamp: Date.now()
    };

    return this.encrypt(stack, key);
  }

  /**
   * Decrypt glyph stack from P2P
   */
  async decryptGlyphStack(encryptedStack, key) {
    const plaintext = await this.decrypt(encryptedStack, key);
    return JSON.parse(plaintext);
  }

  // ==================== HASHING ====================

  /**
   * Hash data using SHA-256
   */
  async hash(data) {
    if (!this.supported) {
      return this.fallbackHash(data);
    }

    let input;
    if (typeof data === 'string') {
      input = new TextEncoder().encode(data);
    } else if (typeof data === 'object') {
      input = new TextEncoder().encode(JSON.stringify(data));
    } else {
      input = data;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', input);
    return this.bytesToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Hash a glyph for indexing
   */
  async hashGlyph(glyph, data) {
    const combined = JSON.stringify({ glyph, data });
    return this.hash(combined);
  }

  /**
   * Generate HMAC for message authentication
   */
  async hmac(data, key) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    // Import key for HMAC
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? new TextEncoder().encode(key) : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      typeof data === 'string' ? new TextEncoder().encode(data) : data
    );

    return this.bytesToHex(new Uint8Array(signature));
  }

  /**
   * Verify HMAC
   */
  async verifyHmac(data, signature, key) {
    const computed = await this.hmac(data, key);
    return computed === signature;
  }

  // ==================== SIGNING ====================

  /**
   * Generate signing key pair (ECDSA)
   */
  async generateSigningKeyPair() {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );

    return keyPair;
  }

  /**
   * Sign data
   */
  async sign(data, privateKey) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      privateKey,
      typeof data === 'string' ? new TextEncoder().encode(data) : data
    );

    return this.bytesToHex(new Uint8Array(signature));
  }

  /**
   * Verify signature
   */
  async verify(data, signature, publicKey) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      publicKey,
      this.hexToBytes(signature),
      typeof data === 'string' ? new TextEncoder().encode(data) : data
    );

    return isValid;
  }

  /**
   * Export public key to hex
   */
  async exportPublicKey(publicKey) {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return this.bytesToHex(new Uint8Array(exported));
  }

  /**
   * Import public key from hex
   */
  async importPublicKey(hexKey) {
    const keyData = this.hexToBytes(hexKey);
    return crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );
  }

  // ==================== KEY EXCHANGE ====================

  /**
   * Generate key exchange pair (ECDH)
   */
  async generateKeyExchangePair() {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveBits', 'deriveKey']
    );

    return keyPair;
  }

  /**
   * Derive shared secret from ECDH
   */
  async deriveSharedSecret(privateKey, publicKey) {
    if (!this.supported) {
      throw new Error('Web Crypto API not supported');
    }

    const sharedKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    return sharedKey;
  }

  // ==================== UTILITY ====================

  /**
   * Convert bytes to hex string
   */
  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to bytes
   */
  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Encode data to base64
   */
  toBase64(data) {
    if (typeof data === 'string') {
      return btoa(unescape(encodeURIComponent(data)));
    }
    return btoa(String.fromCharCode(...new Uint8Array(data)));
  }

  /**
   * Decode base64 to string
   */
  fromBase64(base64) {
    return decodeURIComponent(escape(atob(base64)));
  }

  /**
   * Fallback encryption (for non-secure contexts)
   */
  fallbackEncrypt(data) {
    console.warn('Using fallback encryption - not cryptographically secure');
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const encoded = this.toBase64(str);
    return {
      ciphertext: encoded,
      iv: '',
      algorithm: 'base64-fallback',
      warning: 'Not cryptographically secure'
    };
  }

  /**
   * Fallback decryption
   */
  fallbackDecrypt(encryptedData) {
    return this.fromBase64(encryptedData.ciphertext);
  }

  /**
   * Fallback hash
   */
  fallbackHash(data) {
    // Simple FNV-1a hash (same as in sw.js)
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Check if Web Crypto is supported
   */
  isSupported() {
    return this.supported;
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      webCrypto: this.supported,
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : true,
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      pbkdf2Iterations: this.pbkdf2Iterations
    };
  }
}

/**
 * SecureGlyphStore - Encrypted glyph storage
 */
class SecureGlyphStore {
  constructor(masterPassword = null) {
    this.crypto = new GlyphCrypto();
    this.masterPassword = masterPassword;
    this.masterKey = null;
    this.store = new Map();
    this.initialized = false;
  }

  /**
   * Initialize with master password
   */
  async initialize(password = null) {
    if (password) {
      this.masterPassword = password;
    }

    if (!this.masterPassword) {
      throw new Error('Master password required');
    }

    const { key, salt } = await this.crypto.deriveKey(this.masterPassword);
    this.masterKey = key;
    this.salt = salt;
    this.initialized = true;

    return {
      initialized: true,
      salt: this.crypto.bytesToHex(salt)
    };
  }

  /**
   * Store encrypted glyph
   */
  async storeGlyph(glyph, data) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    const encrypted = await this.crypto.encryptGlyph(glyph, data, this.masterKey);
    const hash = await this.crypto.hashGlyph(glyph, data);

    this.store.set(glyph, {
      encrypted,
      hash,
      storedAt: Date.now()
    });

    return { glyph, hash };
  }

  /**
   * Retrieve and decrypt glyph
   */
  async getGlyph(glyph) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    const stored = this.store.get(glyph);
    if (!stored) {
      return null;
    }

    const decrypted = await this.crypto.decryptGlyph(stored.encrypted, this.masterKey);
    return decrypted;
  }

  /**
   * Delete glyph
   */
  deleteGlyph(glyph) {
    return this.store.delete(glyph);
  }

  /**
   * List all glyphs (without decrypting)
   */
  listGlyphs() {
    const list = [];
    for (const [glyph, data] of this.store) {
      list.push({
        glyph,
        hash: data.hash,
        storedAt: data.storedAt
      });
    }
    return list;
  }

  /**
   * Export encrypted store
   */
  async exportStore() {
    const entries = [];
    for (const [glyph, data] of this.store) {
      entries.push({ glyph, ...data });
    }

    return {
      version: '1.0',
      salt: this.crypto.bytesToHex(this.salt),
      entries,
      exportedAt: Date.now()
    };
  }

  /**
   * Import encrypted store
   */
  async importStore(data, password) {
    const { key } = await this.crypto.deriveKey(password, data.salt);

    for (const entry of data.entries) {
      try {
        // Verify we can decrypt with the provided password
        await this.crypto.decryptGlyph(entry.encrypted, key);
        this.store.set(entry.glyph, entry);
      } catch (e) {
        console.error(`Failed to import glyph ${entry.glyph}:`, e);
      }
    }

    return { imported: data.entries.length };
  }

  /**
   * Change master password
   */
  async changePassword(oldPassword, newPassword) {
    // Verify old password
    const { key: oldKey } = await this.crypto.deriveKey(oldPassword, this.salt);

    // Re-encrypt all glyphs with new key
    const { key: newKey, salt: newSalt } = await this.crypto.deriveKey(newPassword);

    for (const [glyph, data] of this.store) {
      const decrypted = await this.crypto.decryptGlyph(data.encrypted, oldKey);
      const reencrypted = await this.crypto.encryptGlyph(glyph, decrypted.data, newKey);
      data.encrypted = reencrypted;
    }

    this.masterKey = newKey;
    this.salt = newSalt;

    return { success: true };
  }

  /**
   * Clear store
   */
  clear() {
    this.store.clear();
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.GlyphCrypto = GlyphCrypto;
  self.SecureGlyphStore = SecureGlyphStore;
}
