/* ============================================================
   REAL WEBRTC P2P GLYPH NETWORK
   π-KUHUL Distributed Knowledge Sharing
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * SignalingChannel - Coordinates WebRTC connections
 * In production, this would connect to a signaling server
 * For now, uses BroadcastChannel for same-origin peers
 */
class SignalingChannel {
  constructor(peerId) {
    this.peerId = peerId;
    this.handlers = new Map();
    this.channel = null;

    // Try BroadcastChannel for same-origin communication
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('mx2lm-p2p-signaling');
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    }
  }

  send(targetPeerId, type, data) {
    const message = {
      from: this.peerId,
      to: targetPeerId,
      type,
      data,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  broadcast(type, data) {
    const message = {
      from: this.peerId,
      to: '*',
      type,
      data,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  handleMessage(message) {
    // Ignore own messages
    if (message.from === this.peerId) return;

    // Check if message is for us
    if (message.to !== '*' && message.to !== this.peerId) return;

    const handler = this.handlers.get(message.type);
    if (handler) {
      handler(message.from, message.data);
    }
  }

  on(type, handler) {
    this.handlers.set(type, handler);
  }

  close() {
    if (this.channel) {
      this.channel.close();
    }
  }
}

/**
 * WebRTCPeer - Manages a single WebRTC peer connection
 */
class WebRTCPeer {
  constructor(peerId, localPeerId, signaling, crypto = null) {
    this.peerId = peerId;
    this.localPeerId = localPeerId;
    this.signaling = signaling;
    this.crypto = crypto;

    this.connection = null;
    this.dataChannel = null;
    this.connected = false;
    this.messageQueue = [];
    this.handlers = new Map();

    // ICE configuration
    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  async connect(isInitiator = false) {
    if (typeof RTCPeerConnection === 'undefined') {
      console.warn('WebRTC not available');
      return false;
    }

    this.connection = new RTCPeerConnection(this.iceConfig);

    // Handle ICE candidates
    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send(this.peerId, 'ice-candidate', {
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    this.connection.onconnectionstatechange = () => {
      const state = this.connection.connectionState;
      if (state === 'connected') {
        this.connected = true;
        this.flushMessageQueue();
      } else if (state === 'disconnected' || state === 'failed') {
        this.connected = false;
      }
    };

    if (isInitiator) {
      // Create data channel
      this.dataChannel = this.connection.createDataChannel('glyphs', {
        ordered: true
      });
      this.setupDataChannel();

      // Create and send offer
      const offer = await this.connection.createOffer();
      await this.connection.setLocalDescription(offer);
      this.signaling.send(this.peerId, 'offer', { sdp: offer });
    } else {
      // Wait for data channel
      this.connection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }

    return true;
  }

  setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.connected = true;
      this.flushMessageQueue();
    };

    this.dataChannel.onclose = () => {
      this.connected = false;
    };

    this.dataChannel.onmessage = async (event) => {
      let data = event.data;

      // Decrypt if crypto is available
      if (this.crypto && typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (parsed.encrypted) {
            data = await this.crypto.decrypt(parsed.ciphertext, parsed.iv);
          }
        } catch (e) {
          // Not encrypted, use as-is
        }
      }

      try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        this.handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  async handleOffer(offer) {
    await this.connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    this.signaling.send(this.peerId, 'answer', { sdp: answer });
  }

  async handleAnswer(answer) {
    await this.connection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(candidate) {
    if (this.connection && candidate) {
      try {
        await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Failed to add ICE candidate:', e);
      }
    }
  }

  handleMessage(message) {
    const handler = this.handlers.get(message.type);
    if (handler) {
      handler(message.data, this.peerId);
    }
  }

  async send(type, data) {
    const message = JSON.stringify({ type, data, from: this.localPeerId });

    if (!this.connected || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.messageQueue.push(message);
      return false;
    }

    // Encrypt if crypto is available
    if (this.crypto) {
      const encrypted = await this.crypto.encrypt(message);
      this.dataChannel.send(JSON.stringify({ encrypted: true, ...encrypted }));
    } else {
      this.dataChannel.send(message);
    }

    return true;
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(message);
      } else {
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  on(type, handler) {
    this.handlers.set(type, handler);
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.connection) {
      this.connection.close();
    }
    this.connected = false;
  }
}

/**
 * P2PGlyphNetwork - Main P2P network for glyph sharing
 */
class P2PGlyphNetwork {
  constructor(config = {}) {
    // Generate unique peer ID
    this.peerId = config.peerId || this.generatePeerId();
    this.peers = new Map();
    this.signaling = new SignalingChannel(this.peerId);
    this.crypto = config.crypto || null;

    // Glyph storage
    this.glyphStore = new Map();
    this.glyphIndex = new Map();  // glyph -> Set of peer IDs that have it

    // Knowledge sync state
    this.syncVersion = 0;
    this.pendingSync = new Map();

    // Event handlers
    this.eventHandlers = new Map();

    // Setup signaling handlers
    this.setupSignaling();

    // Announce presence
    this.announce();

    // Stats
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      glyphsShared: 0,
      glyphsReceived: 0,
      peersConnected: 0
    };
  }

  generatePeerId() {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  setupSignaling() {
    // Handle peer discovery
    this.signaling.on('announce', (peerId, data) => {
      if (!this.peers.has(peerId)) {
        this.connectToPeer(peerId, true);
      }
    });

    // Handle WebRTC offers
    this.signaling.on('offer', async (peerId, data) => {
      let peer = this.peers.get(peerId);
      if (!peer) {
        peer = new WebRTCPeer(peerId, this.peerId, this.signaling, this.crypto);
        await peer.connect(false);
        this.setupPeerHandlers(peer);
        this.peers.set(peerId, peer);
      }
      await peer.handleOffer(data.sdp);
    });

    // Handle WebRTC answers
    this.signaling.on('answer', async (peerId, data) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        await peer.handleAnswer(data.sdp);
      }
    });

    // Handle ICE candidates
    this.signaling.on('ice-candidate', async (peerId, data) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        await peer.handleIceCandidate(data.candidate);
      }
    });

    // Handle disconnect
    this.signaling.on('disconnect', (peerId) => {
      this.disconnectPeer(peerId);
    });
  }

  setupPeerHandlers(peer) {
    // Handle glyph share
    peer.on('glyph-share', (data, fromPeer) => {
      this.handleGlyphShare(data, fromPeer);
    });

    // Handle glyph query
    peer.on('glyph-query', (data, fromPeer) => {
      this.handleGlyphQuery(data, fromPeer);
    });

    // Handle glyph response
    peer.on('glyph-response', (data, fromPeer) => {
      this.handleGlyphResponse(data, fromPeer);
    });

    // Handle sync request
    peer.on('sync-request', (data, fromPeer) => {
      this.handleSyncRequest(data, fromPeer);
    });

    // Handle sync response
    peer.on('sync-response', (data, fromPeer) => {
      this.handleSyncResponse(data, fromPeer);
    });

    // Handle knowledge broadcast
    peer.on('knowledge-broadcast', (data, fromPeer) => {
      this.handleKnowledgeBroadcast(data, fromPeer);
    });
  }

  // ==================== CONNECTION MANAGEMENT ====================

  announce() {
    this.signaling.broadcast('announce', {
      peerId: this.peerId,
      capabilities: ['glyph-share', 'glyph-query', 'sync'],
      version: '1.0.0'
    });
  }

  async connectToPeer(peerId, isInitiator = true) {
    if (this.peers.has(peerId)) return;

    const peer = new WebRTCPeer(peerId, this.peerId, this.signaling, this.crypto);
    this.setupPeerHandlers(peer);
    this.peers.set(peerId, peer);

    await peer.connect(isInitiator);
    this.stats.peersConnected = this.peers.size;

    this.emit('peer-connected', { peerId });
    return peer;
  }

  disconnectPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      this.stats.peersConnected = this.peers.size;
      this.emit('peer-disconnected', { peerId });
    }
  }

  // ==================== GLYPH OPERATIONS ====================

  /**
   * Store a glyph locally
   */
  storeGlyph(glyph, data, metadata = {}) {
    const entry = {
      glyph,
      data,
      metadata: {
        ...metadata,
        storedAt: Date.now(),
        version: this.syncVersion++
      }
    };

    this.glyphStore.set(glyph, entry);

    // Update index
    if (!this.glyphIndex.has(glyph)) {
      this.glyphIndex.set(glyph, new Set());
    }
    this.glyphIndex.get(glyph).add(this.peerId);

    return entry;
  }

  /**
   * Get a glyph from local store
   */
  getGlyph(glyph) {
    return this.glyphStore.get(glyph);
  }

  /**
   * Share a glyph with all connected peers
   */
  async broadcastGlyph(glyph, data, metadata = {}) {
    // Store locally first
    this.storeGlyph(glyph, data, metadata);

    // Broadcast to all peers
    const message = {
      glyph,
      data,
      metadata,
      from: this.peerId
    };

    for (const [peerId, peer] of this.peers) {
      await peer.send('glyph-share', message);
      this.stats.glyphsShared++;
    }

    this.stats.messagesSent += this.peers.size;
    this.emit('glyph-broadcast', { glyph, peerCount: this.peers.size });
  }

  /**
   * Query peers for a glyph
   */
  async queryGlyph(glyph, options = {}) {
    // Check local first
    const local = this.getGlyph(glyph);
    if (local && !options.forceRemote) {
      return { source: 'local', ...local };
    }

    // Query peers
    const responses = [];
    const queryId = this.generatePeerId().slice(0, 8);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(responses.length > 0 ? responses[0] : null);
      }, options.timeout || 5000);

      // Setup response handler
      const handleResponse = (data) => {
        if (data.queryId === queryId) {
          responses.push(data);
          if (responses.length >= (options.minResponses || 1)) {
            clearTimeout(timeout);
            resolve(responses[0]);
          }
        }
      };

      this.once('glyph-query-response', handleResponse);

      // Send query to all peers
      for (const [peerId, peer] of this.peers) {
        peer.send('glyph-query', { glyph, queryId });
      }

      this.stats.messagesSent += this.peers.size;
    });
  }

  /**
   * Handle incoming glyph share
   */
  handleGlyphShare(data, fromPeer) {
    const { glyph, data: glyphData, metadata } = data;

    // Store the glyph
    this.storeGlyph(glyph, glyphData, {
      ...metadata,
      receivedFrom: fromPeer
    });

    // Update index
    if (!this.glyphIndex.has(glyph)) {
      this.glyphIndex.set(glyph, new Set());
    }
    this.glyphIndex.get(glyph).add(fromPeer);

    this.stats.glyphsReceived++;
    this.stats.messagesReceived++;

    this.emit('glyph-received', { glyph, from: fromPeer });
  }

  /**
   * Handle incoming glyph query
   */
  handleGlyphQuery(data, fromPeer) {
    const { glyph, queryId } = data;
    const entry = this.getGlyph(glyph);

    this.stats.messagesReceived++;

    if (entry) {
      const peer = this.peers.get(fromPeer);
      if (peer) {
        peer.send('glyph-response', {
          queryId,
          glyph,
          data: entry.data,
          metadata: entry.metadata,
          from: this.peerId
        });
        this.stats.messagesSent++;
      }
    }
  }

  /**
   * Handle incoming glyph response
   */
  handleGlyphResponse(data, fromPeer) {
    this.stats.messagesReceived++;
    this.emit('glyph-query-response', data);
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Request full sync from a peer
   */
  async requestSync(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return null;

    return new Promise((resolve) => {
      const syncId = this.generatePeerId().slice(0, 8);

      const timeout = setTimeout(() => {
        resolve(null);
      }, 30000);

      this.pendingSync.set(syncId, { resolve, timeout });

      peer.send('sync-request', {
        syncId,
        currentVersion: this.syncVersion,
        glyphCount: this.glyphStore.size
      });
    });
  }

  /**
   * Handle sync request
   */
  handleSyncRequest(data, fromPeer) {
    const { syncId, currentVersion } = data;
    const peer = this.peers.get(fromPeer);
    if (!peer) return;

    // Send all glyphs newer than their version
    const glyphsToSync = [];
    for (const [glyph, entry] of this.glyphStore) {
      if (entry.metadata.version > currentVersion) {
        glyphsToSync.push({
          glyph,
          data: entry.data,
          metadata: entry.metadata
        });
      }
    }

    peer.send('sync-response', {
      syncId,
      glyphs: glyphsToSync,
      totalCount: this.glyphStore.size,
      version: this.syncVersion
    });
  }

  /**
   * Handle sync response
   */
  handleSyncResponse(data, fromPeer) {
    const { syncId, glyphs } = data;

    const pending = this.pendingSync.get(syncId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingSync.delete(syncId);

      // Store received glyphs
      for (const { glyph, data: glyphData, metadata } of glyphs) {
        this.storeGlyph(glyph, glyphData, {
          ...metadata,
          syncedFrom: fromPeer
        });
      }

      pending.resolve({ count: glyphs.length, from: fromPeer });
    }
  }

  /**
   * Handle knowledge broadcast (gossip protocol)
   */
  handleKnowledgeBroadcast(data, fromPeer) {
    const { glyph, knowledge, ttl = 3 } = data;

    // Store if we don't have it
    if (!this.glyphStore.has(glyph)) {
      this.storeGlyph(glyph, knowledge, {
        broadcastedFrom: fromPeer,
        ttl
      });

      // Forward to other peers if TTL > 0
      if (ttl > 0) {
        for (const [peerId, peer] of this.peers) {
          if (peerId !== fromPeer) {
            peer.send('knowledge-broadcast', {
              glyph,
              knowledge,
              ttl: ttl - 1
            });
          }
        }
      }
    }
  }

  // ==================== PATTERN MATCHING ====================

  /**
   * Query all peers for glyphs matching a pattern
   */
  async queryPattern(pattern, options = {}) {
    const results = [];

    // Check local matches first
    const regex = new RegExp(pattern);
    for (const [glyph, entry] of this.glyphStore) {
      if (regex.test(glyph) || regex.test(JSON.stringify(entry.data))) {
        results.push({ glyph, ...entry, source: 'local' });
      }
    }

    // Query peers (optional)
    if (options.queryPeers !== false) {
      // For simplicity, query each peer individually
      // In production, use more efficient gossip/DHT
      for (const [peerId, peer] of this.peers) {
        peer.send('pattern-query', { pattern, queryId: this.generatePeerId().slice(0, 8) });
      }
    }

    return results;
  }

  // ==================== EVENT SYSTEM ====================

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  once(event, handler) {
    const wrappedHandler = (...args) => {
      this.off(event, wrappedHandler);
      handler(...args);
    };
    this.on(event, wrappedHandler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) {
        handlers.splice(idx, 1);
      }
    }
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (e) {
          console.error('Event handler error:', e);
        }
      }
    }
  }

  // ==================== UTILITY ====================

  /**
   * Get network statistics
   */
  getStats() {
    return {
      peerId: this.peerId,
      connectedPeers: this.peers.size,
      storedGlyphs: this.glyphStore.size,
      indexedGlyphs: this.glyphIndex.size,
      syncVersion: this.syncVersion,
      ...this.stats
    };
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers() {
    const peers = [];
    for (const [peerId, peer] of this.peers) {
      peers.push({
        peerId,
        connected: peer.connected
      });
    }
    return peers;
  }

  /**
   * Export all glyphs
   */
  exportGlyphs() {
    const glyphs = {};
    for (const [glyph, entry] of this.glyphStore) {
      glyphs[glyph] = entry;
    }
    return {
      peerId: this.peerId,
      version: this.syncVersion,
      glyphs,
      exportedAt: Date.now()
    };
  }

  /**
   * Import glyphs
   */
  importGlyphs(data) {
    const { glyphs } = data;
    let imported = 0;

    for (const [glyph, entry] of Object.entries(glyphs)) {
      if (!this.glyphStore.has(glyph)) {
        this.storeGlyph(glyph, entry.data, entry.metadata);
        imported++;
      }
    }

    return { imported };
  }

  /**
   * Close all connections
   */
  close() {
    for (const [peerId, peer] of this.peers) {
      peer.close();
    }
    this.peers.clear();
    this.signaling.close();
    this.emit('closed', {});
  }
}

/**
 * GlyphDHT - Distributed Hash Table for glyph lookup
 * Uses Kademlia-like XOR distance metric
 */
class GlyphDHT {
  constructor(peerId, k = 20) {
    this.peerId = peerId;
    this.k = k; // Bucket size
    this.buckets = new Array(256).fill(null).map(() => []);
    this.data = new Map();
  }

  /**
   * Calculate XOR distance between two peer IDs
   */
  distance(id1, id2) {
    const bytes1 = this.hexToBytes(id1);
    const bytes2 = this.hexToBytes(id2);
    let distance = 0n;

    for (let i = 0; i < Math.min(bytes1.length, bytes2.length); i++) {
      distance = (distance << 8n) | BigInt(bytes1[i] ^ bytes2[i]);
    }

    return distance;
  }

  hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return bytes;
  }

  /**
   * Get bucket index for a peer ID
   */
  getBucketIndex(peerId) {
    const distance = this.distance(this.peerId, peerId);
    if (distance === 0n) return 0;

    let index = 0;
    let d = distance;
    while (d > 0n) {
      d >>= 1n;
      index++;
    }
    return Math.min(index - 1, 255);
  }

  /**
   * Add a peer to the routing table
   */
  addPeer(peerId, contact) {
    const bucketIdx = this.getBucketIndex(peerId);
    const bucket = this.buckets[bucketIdx];

    // Check if already in bucket
    const existing = bucket.findIndex(p => p.peerId === peerId);
    if (existing >= 0) {
      // Move to end (most recently seen)
      bucket.push(bucket.splice(existing, 1)[0]);
      return true;
    }

    // Add if bucket not full
    if (bucket.length < this.k) {
      bucket.push({ peerId, contact, lastSeen: Date.now() });
      return true;
    }

    return false; // Bucket full
  }

  /**
   * Find closest peers to a target ID
   */
  findClosestPeers(targetId, count = this.k) {
    const allPeers = [];

    for (const bucket of this.buckets) {
      for (const peer of bucket) {
        allPeers.push({
          ...peer,
          distance: this.distance(peer.peerId, targetId)
        });
      }
    }

    allPeers.sort((a, b) => {
      if (a.distance < b.distance) return -1;
      if (a.distance > b.distance) return 1;
      return 0;
    });

    return allPeers.slice(0, count);
  }

  /**
   * Store data at a key
   */
  store(key, value) {
    this.data.set(key, {
      value,
      storedAt: Date.now()
    });
  }

  /**
   * Retrieve data by key
   */
  get(key) {
    return this.data.get(key)?.value;
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.P2PGlyphNetwork = P2PGlyphNetwork;
  self.WebRTCPeer = WebRTCPeer;
  self.SignalingChannel = SignalingChannel;
  self.GlyphDHT = GlyphDHT;
}
